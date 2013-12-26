from django.contrib.auth.models import User
from rest_framework import viewsets, mixins, status, reverse
from rest_framework.response import Response
from rest_framework.decorators import action, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated, IsAuthenticatedOrReadOnly
from django.contrib.contenttypes.models import ContentType


from blog.rest.sessions import ExpiringTokenAuthentication
from blog.rest import sessions
from blog.rest import serializers


from django.db import IntegrityError, transaction
from django.http import Http404

import json
from blog.rest.viewsets.common import PaginationError, build_collection_json_from_query, post_view
from blog.rest.serializers import PostSerializer, PostPaginationSerializer, serialize_sentence
from blog.models import *

import re
from blog import parser
import nltk
import difflib

import collections

# For parsing post content. Blocks contain nodes containing text
Block = collections.namedtuple('Block', ['mode', 'text'])
Node = collections.namedtuple('Node', ['mode', 'text'])

# 't' = text
# 'c' = code
BLOCK_MODE_TEXT = 't'
BLOCK_MODE_CODE = 'c'
NODE_MODE_TEXT = 't'
NODE_MODE_CODE = 'c'

# TODO: WRITE TESTS FOR THESE GLOBALS, 
# I've tested them already but could use the redundancy.

def tokenize_into_sentences(content):
    # Lazy loaded?
    # When creating a new post, tokenize the content with this function
    detector = nltk.load('tokenizers/punkt/english.pickle')        
    return detector.tokenize( content )


def split_content_into_blocks(content):
    """
    Split into blocks. 
    Priority of splits:
      1) Code block
      2) Paragraph block
    Split by 3 new lines
    Prioritize Code Blocks over Text only Blocks
    
    [[[
    
                                       <-- Should this be a new paragraph?
    ]]] A mixed type.
                                       <-- Notice the paragraph ends here
    Should that be a [[[blocked]]]? 

    """
    CODE_BLOCK_REGEX = '(\[\[\[.*?\]\]\])'
    PARAGRAPH_SPLIT_REGEX = '\n[\s]*?\n[\s]*?\n'
    
    code_blocks = re.split(CODE_BLOCK_REGEX, content)


    blocks = []
    remaining_text = content
    temp_string = ''

    def search(txt):
        return re.search(CODE_BLOCK_REGEX, txt)
    
    # Breaks text before match into paragraphs, keeps the match itself intact
    # Appends to blocks
    def consume_match(blocks, txt, match):
        #blocks.append( Block(BLOCK_MODE_TEXT, txt[:match.start()] ) )
        consume_non_code_match(blocks, txt[:match.start()])
        blocks.append( Block(BLOCK_MODE_CODE, txt[match.start() : match.end()] ) )

    # Breaks text into paragraphs before appending to blocks
    def consume_non_code_match(blocks, txt):
        paras = re.split(PARAGRAPH_SPLIT_REGEX, txt)
        for para in paras:
            blocks.append( Block(BLOCK_MODE_TEXT, para) )

    # Get the text remaining after a match
    # Deals with the case: [[[ [[[ ]]] ]]] A B /A /B
    def move_cursor_to_end_of_match(txt, match):
        return txt[match.end():]

    while len(remaining_text) > 0:

        match = search(remaining_text)

        if match is not None:
            consume_match(blocks, remaining_text, match)
            remaining_text = move_cursor_to_end_of_match(remaining_text, match)
        else:
            consume_non_code_match(blocks, remaining_text)
            remaining_text = ''


    return blocks
    #return re.split(PARAGRAPH_SPLIT_REGEX, content)

#def split_node_into_paragraphs?

def split_block_into_nodes(block):
    """
    Split a Block into nodes of text or inline code nodes.

    If the Block mode is text, further split into nodes.
    If the Block mode is code, the whole block is atomic and doesn't need splitting.

    TODO:
    Utilize markdown?

    Example:
    >>> split_blocks_into_nodes('This is a test [[[asdf.jpg]]] another sentence.')
    ('t', 'This is a test'), ('a', '[[[asdf.jpg]]]'), ('t', 'another sentence')
    """

    # Could be used as a Markdown Block
    CODE_NODE_REGEX = '(\@\[.*?\]\@)'

    parsed = []

    if block.mode == BLOCK_MODE_TEXT:
        
        # 'Multiple sentences.@[Some Markdown]@More text? Blah'
        nodes = re.split(CODE_NODE_REGEX, block.text)

        # ('Multiple sentences', '@[Some Markdown]@', 'More text? Blah')
        for node in nodes:
            if re.match(CODE_NODE_REGEX, node):
                parsed.append( Node(NODE_MODE_CODE, node) )
            else:
                parsed.append( Node(NODE_MODE_TEXT, node) )
    else:
        # !!!For Lazyness I just made the block mode into node mode!!!
        parsed.append( Node(block.mode, block.text) )


    return parsed


def expand_nodes_that_have_sentences(nodes):
    """
    Second pass allows some flexibility. But could be refactored to be faster....

    TODO: PUT THIS IN THAT FUNCTION UP OVER THERE, YOU KNOW ^^^
    Some nodes need even further processing. Split text nodes into more text nodes.
    """
    sentences = [] # This gets returned

    for node in nodes:
        if node.mode == NODE_MODE_TEXT:
            # Each 't' node may be made of a couple of sentences.
            tokenized_sents = tokenize_into_sentences(node.text)
            for token in tokenized_sents:
                sentences.append( Node(node.mode, token.strip()) )
        else:
            # Each non 't' node (FOR NOW this must be 'c') node gets priviledge to get inputted as-is
            sentences.append( Node(node.mode, node.text) )
    return sentences


def for_each_node_in_content(content):
    # Split content into paragraphs (blocks)
    # for each block, split into nodes of the same paragraph
    # If the node is just text, then tokenize into sentences
    
    # Split the content into paragraphs. 
    # Even if there is no split found, this function always returns at least 1 item
    paragraphs = split_content_into_blocks(content)

    # Run the sentencer on each paragraph
    # Each new sentence receives the outer new_set variable as the sentence_set
    # 
    # [ "Sent1. Sent2. Sent3." ,  "Sent4. Sent5. Sent6." ]
    for par_index, par_value in enumerate( paragraphs ):

        # Use NLTK to tokenize each node into sentences
        nodes = split_block_into_nodes( par_value )
        sentenced_nodes = expand_nodes_that_have_sentences(nodes)
        
        # For each sentence in the paragraph, make a new sentence
        # Each sentence is affected by the outer par_index counter
        for node_index, node in enumerate(sentenced_nodes):
            yield (par_index, par_value, node_index, node)



def get_closest_sentence_model_to_text(text, sentence_models, cutoff = 0.4):
    """
    Given text, get the best Sentence model that most closely represents it

    @Returns (ratio:float, Sentence:model)

    TODO: 
    Use cosine similarity and take into account text ordering as well as text
    """
    winning_model = (-1000, None)
    
    s = difflib.SequenceMatcher()
    s.set_seq2(text)

    for sentence in sentence_models:
        s.set_seq1(sentence.text.value)

        if s.real_quick_ratio() >= cutoff and \
            s.quick_ratio() >= cutoff:
                ratio = s.ratio()
                if ratio >= cutoff and ratio >= winning_model[0]:
                    winning_model = (ratio, sentence)

    if winning_model[1] == None:
        return None

    return winning_model


def create_or_get_text(text_string):
    try: 
        text_obj = Text.objects.get(value = text_string)
    except:
        text_obj = Text.objects.create(value = text_string)
    return text_obj


def create_post(title, author, parent_content_type, parent_id, content):
    """
    Perform the post creation algorithm by creating the associated django models 
    and ensuring their integrity. 

    @returns a dictionary of results
    """

    # Django's generic foreign key doesn't use a string field
    parent_content_type = ContentType.objects.get(model = parent_content_type)

    # Create a new post
    new_post = Post.objects.create(title = title, author = author, parent_content_type = parent_content_type, parent_id = parent_id)
    
    #new_post.parent_object = parent
    #new_post.save() # Save after editing the parent field, modified field will change again

    # TODO: Make these transactions atomic
    # Increase number children for parent. 
    # This will decrease unneccessary queries to sentences that have no posts
    parent = parent_content_type.get_object_for_this_type(pk = parent_id)
    parent.number_children = parent.number_children + 1
    parent.save()

    # Create a brand new set for the post. It is time stamped on creation
    new_set = SentenceSet.objects.create(parent = new_post)

    # For caching so don't have to re-query the result
    new_sentences = []

    for par_index, par_value, node_index, node in for_each_node_in_content(content):
        # For each sentence, create or get text. Cannot have duplicate texts.
        text_obj = create_or_get_text(node.text)

        # Forge a binary relation between the created text and the new set
        # Remember to increment the indices by 1 since in the loop the indices start at 0
        new_sentence = Sentence.objects.create(sentence_set = new_set, 
                                               text = text_obj,
                                               ordering = node_index + 1,
                                               paragraph = par_index + 1,
                                               mode = node.mode
                                               )
        # Cache the new sentence
        new_sentences.append(new_sentence)

    return {
        'sentence_set': new_set,
        'number_sentences': node_index + 1,
        'number_paragraphs': par_index + 1,
        'sentences': new_sentences
    }


def patch_post(post, content):
    """
    Patch request will create a new SentenceSet (version) of the post if 
    the content is different.

    Tokenize input for sentences.
    For each sentence in the new pack, 
    decide whether it has a similarity pairing with an old sentence.

    Case 1:
    No pairing
    A sentence has shown up which cannot be found in the old set. 
    Create new text and new sentence.

    (Note)
    If the comparison was reversed (compare old set to new set), then
    information about deleted sentences would be found. I have decided to
    do the comparison the other way...

    Case 2:
    A pairing exists
    The new sentence is either moved, unchanged, or edited.
    - If it has not been edited, there is no need to create new text.
    Just create a new sentence.
    - The new sentence is likely an edit of the previous sentence.
    Create new text and new sentence, but set its previous_version pointer to
    point to the old sentence. The previous_version pointer will allow readers
    to see previous comments made on the same sentence throughout its chain of edits.

    @param post: Post model
    @param content: A string containing multiple sentences to be parsed.
    @returns a dictionary of results
    """
    # Get sentences of the lastest version
    # Assumption: That each post has a sentence set    
    latest_sentence_set = SentenceSet.objects.filter(parent = post)[0]

    # To compare the new sentences to old sentence models
    old_sentence_models = Sentence.objects.filter(sentence_set = latest_sentence_set)

    # Create a new version of the post
    new_set = SentenceSet.objects.create(parent = post)

    # Count the number of merged sentences. 
    # This is incremented for every match found as we iterate over the new_sentences
    similarity_counter = 0

    # Loop through new sentences, create new sentences
    # Set the previous_version pointer if there is a match
    for par_index, par_value, node_index, node in for_each_node_in_content(content):

        # Gets the match to the new string
        # A match is a (ratio, Sentence)
        match = get_closest_sentence_model_to_text(node.text, old_sentence_models, cutoff = 0.4)

        #self.note("Node: %s" % (node,))
        #self.note("Closest Match: " + str( match ))
        #if match:
        #    self.note("Match: (%s, %s): %s, %s" % (match[0], match[1], match[1].text, match[1].text.value))
        
        # Create new Text for each node 
        # Then create new Sentence for each node
        text = create_or_get_text( node.text )

        if match is None:
            # If there is no match, don't set the previous_version pointer
            #self.note("no match")
            #self.note("mode %s, node_index %s text %s: %s" % (node.mode, node_index, text, text.value))
            Sentence.objects.create(sentence_set = new_set, 
                                    text = text, 
                                    ordering = node_index + 1,
                                    paragraph = par_index + 1,
                                    mode = node.mode)
        else:                 
            # There was a match! 
            # Set the previous_version pointer so that the new sentence has a reference
            # to the old sentence
            similarity_counter += 1

            #self.note("match")
            #self.note("mode %s, node_index %s text %s: %s" % (node.mode, node_index, text, text.value))
            Sentence.objects.create(sentence_set = new_set, 
                                    text = text, 
                                    ordering = node_index + 1, 
                                    paragraph = par_index + 1,
                                    mode = node.mode,
                                    previous_version = match[1])

    return {
        'number_merged': similarity_counter,
        'number_sentences': node_index + 1,
        'number_paragraphs': par_index + 1
    }

class PostViewSet(viewsets.GenericViewSet):
    
    authentication_classes = (ExpiringTokenAuthentication,)
    
    NOT_FOUND_JSON = {"detail": "Not Found"}
    MUST_BE_AUTHOR_OF_POST_JSON = {"detail": "You have to be the author to patch this post."}
    CONTENT_TO_SHORT_JSON = {"error": "Content too short."}

    serializer_class = PostSerializer


    def list(self, request):
        """
        Removed: Filter posts its parent_object, be it blog, post, or sentence as determined by input pk
        Pagination is a little icky
        """
        # blog_pk = request.GET.get('blog', None)
        # post_pk = request.GET.get('post', None)
        # sentence_pk = request.GET.get('sentence', None)


        # if blog_pk is not None:
        #     return post_view('blog', request, blog_pk)
        # elif post_pk is not None:
        #     return post_view('post', request, post_pk)
        # elif sentence_pk is not None:
        #     return post_view('sentence', request, sentence_pk)
        # else:
        #     # Everything is none
        #     posts = Post.objects.all()

        #serialized_posts = PostSerializer(posts, many = True, context = {'request': request})
        #return Response( serialized_posts.data, status = 200 )
        
        posts = Post.objects.all()

        page = self.paginate_queryset(posts)
        if page is not None:
            #serializer = self.get_pagination_serializer(page)
            serializer = PostPaginationSerializer(page)
        else:
            serializer = self.get_serializer(posts, many=True)

        serializer.data['href'] = request.build_absolute_uri('')
        serializer.data['template'] = {
            "post": [
                {"name": "title",               "prompt": "(String) Title of the post"},
                {"name": "parent_content_type", "prompt": "(String) Either 'blog', 'post', or 'sentence' representing the parent"},
                {"name": "parent_id",           "prompt": "(Number) id of the parent"},
                {"name": "content",             "prompt": "(String) The body of the post consisting of multiple sentences."}
            ],
            "patch": [
                {"name": "content",             "prompt": "(String) The body of the post consisting of multiple sentences."}
            ]
        }
        
        return Response(serializer.data)


        # def post_collection_serializer(p):
        #     serialized_json = {}
        #     serialized_json['id'] = p.id
        #     serialized_json['href'] = '/blog/api/posts/%s' % (p.id,)
        #     serialized_json['title'] = p.title
        #     serialized_json['author'] = p.author.pk
        #     serialized_json['created'] = p.created

        #     serialized_json['parent_content_type'] = p.parent_content_type.name
        #     serialized_json['parent_id'] = p.parent_id
        #     return serialized_json

        # return_json = build_collection_json_from_query(request, posts, post_collection_serializer)
        # return_json['collection']['template']['data'] = [
        #     {"title": "(String) Title of your post"},
        #     {"parent_content_type": "(String) Name of the content type. Accepts 'blog', 'post', 'sentence'"},
        #     {"parent_id": "(Number) Id of the parent object"}
        # ]
        # return Response(return_json, status = 200 )


    def create(self, request):
        """
        Preconditions:
        User is authenticated, either via tokens or cookie sessions
        The request is authenticated via the authentication class. 
        The author *is* the user 
        if request.user != post_serializer.object['author']:
           return Response({'error': 'You are not logged in as the given author'}, status = 401)
        Title is not null
        
        If the parent object is a blog and is RESTRICTED, abort write process, 
        1) unless user is the creator
        2) or user is white listed for that blog
        
        Parent object exists <- This is checked in serializer validation
        Content can be empty or a string containing multiple sentences. 
        
        The post is created before content is validated...?
        There are no validations on sentences...
        
        If there is content, parse it (ie. an essay) into sentences via NLTK punkt.
        Create sentences for each sentence
        """
        #content_type = request.META.get('CONTENT_TYPE', None) 
        #if content_type == 'application/json' or content_type == 'text/javascript':
        #    data = 

        # Parse user input
        post_serializer = PostSerializer(data = request.DATA, context={'request': request})

        if not post_serializer.is_valid():
            # The user input was invalid
            return Response(post_serializer.errors, status = 400)

        # Serializer doesn't check for empty content since its IO is dynamic 
        content = request.DATA.get('content', None)
        if content is None:
            return Response({"error": "There was no content, refer to template for reference."}, status = 400)
       

        # If the post is made on a blog content type and the blog is RESTRICTED, 
        # perform special authorization checks:
        # A restricted blog means only users on the white list of the blog can post to it
        if post_serializer.data['parent_content_type'] == "blog":

            blog = Blog.objects.get(pk = post_serializer.data['parent_id'])

            if blog.is_restricted:
                # When a blog is restricted, the creator is allowed 
                # access to it by default, regardless of whether s/he is on whitelist!
                if blog.creator != request.user:
                    wl = WhiteList.objects.filter(blog = blog, user = request.user)
                    if len(wl) < 1:
                        return Response({"status": "This blog is restricted to members in the white list."}, status = 401)


        title = post_serializer.data['title']
        author = request.user
        parent_content_type = post_serializer.data['parent_content_type']
        parent_id = post_serializer.data['parent_id']

        # Create post
        creation_result = create_post(title = title, 
                                        author = author, 
                                        parent_content_type = parent_content_type, 
                                        parent_id = parent_id, 
                                        content = content)

        return_json = {}

        return_json['sentences'] = []
        #sentences = Sentence.objects.filter(sentence_set = creation_result['sentence_set'])
        for sentence in creation_result['sentences']:
            return_json['sentences'].append( serialize_sentence(sentence) )
        return_json['number_sentences'] = len(creation_result['sentences'])

        return_json['number_paragraphs'] = creation_result['number_paragraphs']

        return Response(return_json, status = 201)


    def note(self, str):
        print(str)
        pass

    def partial_update(self, request, pk = None):
        """
        Preconditions:
        User is logged in. 

        """
        try:
            pk = int(pk)
            post = Post.objects.get(pk = pk)
        except ValueError:
            return Response(self.NOT_FOUND_JSON, status = 404)
        except Post.DoesNotExist:
            return Response(self.NOT_FOUND_JSON, status = 404)

        # Test if post author is the user
        if post.author != request.user:
            return Response(self.MUST_BE_AUTHOR_OF_POST_JSON, status = 401)


        # Check the integrity of the content
        content = request.DATA.get('content', None)
        if (content is None) or ( len(content) < 1 ):
            return Response(self.CONTENT_TO_SHORT_JSON, status = 400)

        patch_result = patch_post(post, content)

        return_json = {}
        return_json['number_sentences'] = patch_result['number_sentences']
        return_json['number_merged'] = patch_result['number_merged']
        return_json['number_versions'] = len( SentenceSet.objects.filter(parent = post) )
        return_json['post'] = post.pk

        return Response(return_json, status = 201)


    def retrieve(self, request, pk = None):

        try:
            pk = int(pk)
        except ValueError:
            return Response(self.NOT_FOUND_JSON, status = 404)

        try:
            # Get Post
            post = Post.objects.get(pk = pk)

            # Encode post as JSON
            serialized_post = PostSerializer(post, context={'request':request})
            return_json = serialized_post.data

            # Show versions available
            post_versions = SentenceSet.objects.filter(parent = post)

            # URL option to get versions
            if request.GET.get('version', None) is not None:
                try: 
                    current_version_id = int( request.GET['version'] )
                    #current_version = SentenceSet.objects.get(pk = current_version_id)
                    current_version = post_versions[current_version_id]
                except:
                    return Response(self.NOT_FOUND_JSON, status = 404)
            else:
                # If there is no ?version query string just load the most recent version
                current_version = post_versions[0]            

            return_json['versions'] = len( post_versions )

            return_json["sentences"] = []

            # ordered by ordering
            sentences = Sentence.objects.filter(sentence_set = current_version)

            for sentence in sentences:
                
                serialized_sentence = serialize_sentence(sentence)

                if sentence.number_children > 0:
                    serialized_sentence['posts'] = []
                    sentence_posts = Post.objects.filter(parent_content_type = ContentType.objects.get(model='sentence'), parent_id = sentence.pk)
                    for sentence_post in sentence_posts:
                        post_serialized = PostSerializer(sentence_post, context = {'request': request})
                        serialized_sentence['posts'].append( post_serialized.data )


                return_json['sentences'].append( serialized_sentence )

            return Response(return_json, status = 200)

        except Post.DoesNotExist as dne:
            return Response(self.NOT_FOUND_JSON, status = 404)


    def destroy(self, request, pk = None):
        try: 
            post = Post.objects.get(pk = pk)
        except Post.DoesNotExist:
            return Response({"status": "This post doesn't exist"}, status = 404)

        post.is_active = False
        post.save()

        return Response({"status": "Marked inactive!"}, status = 202)

    @action(methods=['GET'])
    def posts(self, request, pk = None):
        return post_view("post", request, pk)