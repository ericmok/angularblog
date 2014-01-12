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
from django.db.models import F

# For parsing post content. Blocks contain nodes containing text
Block = collections.namedtuple('Block', ['mode', 'text'])
Node = collections.namedtuple('Node', ['mode', 'text'])

# 't' = text
# 'c' = code
BLOCK_MODE_TEXT = 't'
BLOCK_MODE_CODE = 'c'
NODE_MODE_TEXT = 't'
NODE_MODE_CODE = 'c' 
# Might create link nodes, citation nodes...etc

# TODO: WRITE TESTS FOR THESE GLOBALS, 
# I've tested them already but could use the redundancy.

def tokenize_into_sentences(content):
    # Lazy loaded?
    # When creating a new post, tokenize the content with this function
    detector = nltk.load('tokenizers/punkt/english.pickle')        
    return detector.tokenize( content )


def split_content_into_blocks(content):
    """
    Note: If there is no content. There is no block returned!

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
    remaining_text = content.strip() # For content that ends in \n\n\n. You don't want a new block
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
        # A text block actually may contain non-text chunks called nodes.
        # 'Multiple sentences.@[Some Markdown]@More text? Blah'
        nodes = re.split(CODE_NODE_REGEX, block.text)

        # ('Multiple sentences', '@[Some Markdown]@', 'More text? Blah')
        for node in nodes:
            if re.match(CODE_NODE_REGEX, node):
                parsed.append( Node(NODE_MODE_CODE, node) )
            else:
                parsed.append( Node(NODE_MODE_TEXT, node) )
    else:
        # This case appears when the block is not a text block
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
    print("Expanding nodes: %s" % [nodes])
    for node in nodes:
        if node.mode == NODE_MODE_TEXT:
            # Each 't' node may be made of a couple of sentences.
            tokenized_sents = tokenize_into_sentences(node.text)
            print("Tokenizing node: %s" % [node.text])
            for token in tokenized_sents:
                print("Token: %s" % [token])
                sentences.append( Node(node.mode, token.strip()) )
        else:
            # Each non 't' node (FOR NOW this must be 'c') node gets priviledge to get inputted as-is
            sentences.append( Node(node.mode, node.text) )
    return sentences


def get_nodes_of_block(block):
    # TODO: This function will have those 2 lines as long as I have no refactored the above functions!
    #
    # Use NLTK to tokenize each node into sentences
    nodes = split_block_into_nodes(block)
    sentenced_nodes = expand_nodes_that_have_sentences(nodes)
    return sentenced_nodes


def for_each_node_in_content(content):
    # No longer use this since I've included paragraph model, which requires
    # that a new paragraph object be created for each iteration of paragraphs
    #
    # Split content into paragraphs (blocks)
    # for each block, split into nodes of the same paragraph
    # If the node is just text, then tokenize into sentences
    
    # Split the content into paragraphs. 
    # Even if there is no split found, this function always returns at least 1 item
    paragraphs = split_content_into_blocks(content)

    # Run the sentencer on each paragraph
    # Each new sentence receives the outer new_edition variable as the edition
    # 
    # [ "Sent1. Sent2. Sent3." ,  "Sent4. Sent5. Sent6." ]
    for par_index, par_value in enumerate( paragraphs ):

        sentences_in_block = get_nodes_of_block(par_value)

        # For each sentence in the paragraph, make a new sentence
        # Each sentence is affected by the outer par_index counter
        for node_index, node in enumerate(sentences_in_block):
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


def content_is_not_empty(content):
    if content is None:
        return False

    def alpha_validator(content):
        return (re.search('[a-zA-Z]', content) is not None)

    def period_validator(content):
        return (re.search('\.', content) is not None)

    def none_or_null_validator(content):
        return ( (re.search('^None$', content) is None) and (re.search('^null$', content) is None) )

    def length_not_zero(content):
        return len(content) > 1

    if alpha_validator(content) and period_validator(content) and none_or_null_validator(content) and length_not_zero(content):
        return True
    else:
        return False


def get_parent_blog_of_model(model_name, model_id):
    """
    Raises exceptions if model not found
    """
    if model_name == 'blog':
        return Blog.objects.get(pk = model_id)

    ct = ContentType.objects.get(name=model_name)
    obj = ct.get_object_for_this_type(pk = model_id)

    if model_name == 'post':
        return obj.blog

    if model_name in ['sentence', 'paragraph']:
        return obj.edition.parent.blog


def create_post(title, author, parent_content_type, parent_id, content):
    """
    Preconditions: content is not empty, the content types exist

    Perform the post creation algorithm by creating the associated django models 
    and ensuring their integrity. 

    TODO: Allow parent_content_type of "paragraph"
    which sets the parent_content_type object to sentence 

    TODO: Consolidate content type retrieval code and content type query code

    @returns a dictionary of results
    """

    # Django's generic foreign key doesn't use a string field
    # Pargraphs refer to Sentences
    parent_model_name = parent_content_type

    parent_ct_object = ContentType.objects.get(model = parent_model_name)
    parent_model = parent_ct_object.get_object_for_this_type(pk = parent_id)

    if parent_content_type == 'blog':
        blog = parent_model
    elif parent_content_type == 'post':
        blog = parent_model.blog
    elif parent_content_type == 'sentence':
        blog = parent_model.edition.parent.blog
    elif parent_content_type == 'paragraph':
        blog = parent_model.edition.parent.blog

    # Create a new post
    new_post = Post.objects.create(title = title, author = author, 
                                    parent_content_type = parent_ct_object, parent_id = parent_id, 
                                    blog = blog)

    # Increase number children for parent_model. 
    # This will decrease unneccessary queries to sentences that have no posts
    parent_model.number_posts = F('number_posts') + 1
    parent_model.save()

    # Create a brand new set for the post. It is time stamped on creation
    new_edition = Edition.objects.create(parent = new_post)

    # For caching so don't have to re-query the result
    new_sentences = []

    # This counter is outside the loop because it shouldn't be reset for each paragraph!
    sentence_counter = 0

    # The case with no paragraphs
    paragraph_counter = 0 

    paragraphs = split_content_into_blocks(content)

    for par_index, par_value in enumerate(paragraphs):

        # Remember to increment the indices by 1 since in the loop the indices start at 0
        paragraph_counter = par_index + 1

        nodes = get_nodes_of_block(par_value)

        new_paragraph = Paragraph.objects.create(edition = new_edition, 
                                                    ordering = paragraph_counter,
                                                    number_sentences = len(nodes))
        print ("NUMBER NODES: ", len(nodes))
        for node in nodes:
            # Each sentence has a unique counter for the entire post, not just each paragraph
            sentence_counter += 1 # Notice that this counter starts counting at 1, not 0!

            # For each sentence, create or get text. Cannot have duplicate texts.
            text_obj = create_or_get_text(node.text)

            # Forge a binary relation between the created text and the new set
            new_sentence = Sentence.objects.create(edition = new_edition, 
                                                   text = text_obj, ordering = sentence_counter,
                                                   paragraph = new_paragraph, mode = node.mode)

            # Cache the new sentence
            new_sentences.append(new_sentence)

    return {
        'edition': new_edition,
        'number_sentences': len( new_sentences ),
        'number_paragraphs': paragraph_counter,
        'sentences': new_sentences
    }


def patch_post(post, content):
    """
    Patch request will create a new Edition (version) of the post if 
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
    latest_edition = Edition.objects.filter(parent = post)[0]

    # To compare the new sentences to old sentence models
    old_sentence_models = Sentence.objects.filter(edition = latest_edition)

    # Create a new version of the post
    new_edition = Edition.objects.create(parent = post)

    # Count the number of merged sentences. 
    # This is incremented for every match found as we iterate over the new_sentences
    similarity_counter = 0

    # Loop through new sentences, create new sentences
    # Set the previous_version pointer if there is a match
    sentence_counter = 0

    paragraphs = split_content_into_blocks(content)

    for par_index, par_value in enumerate( paragraphs ):

        nodes = get_nodes_of_block(par_value)

        # The number of sentences of the new paragraph will have to be set in the next loop
        new_paragraph = Paragraph.objects.create(edition = new_edition, 
                                                    ordering = par_index + 1,
                                                    number_sentences = len(nodes))

        for node in nodes:
            sentence_counter += 1

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
                Sentence.objects.create(edition = new_edition, 
                                        text = text, 
                                        ordering = sentence_counter,
                                        paragraph = new_paragraph,
                                        mode = node.mode)
            else:                 
                # There was a match! 
                # Set the previous_version pointer so that the new sentence has a reference
                # to the old sentence
                similarity_counter += 1

                #self.note("match")
                #self.note("mode %s, node_index %s text %s: %s" % (node.mode, node_index, text, text.value))
                Sentence.objects.create(edition = new_edition, 
                                        text = text, 
                                        ordering = sentence_counter, 
                                        paragraph = new_paragraph,
                                        mode = node.mode,
                                        previous_version = match[1])

    return {
        'number_merged': similarity_counter,
        'number_sentences': sentence_counter,
        'number_paragraphs': par_index + 1
    }


def get_posts_for_every_sentence(post):
    """
    Not used?
    Sideload mechanism: Gets an array of posts for each sentence of a post
    """
    # Load posts made on each sentence of that post
    sentence_posts = []

    # Expectation: Edition is orderedy by date
    edition = Edition.objects.filter(parent = post)[0] 
    sentences_of_post = Sentence.objects.filter(edition = edition)

    for sentence in sentences_of_post:
        
        # Find any posts for the sentence. This is to be side loaded.
        sentence_ct = ContentType.objects.filter(model = 'sentence')
        query = Post.objects.filter(parent_content_type = sentence_ct, parent_id = sentence.pk)[:page_size]
        sentence_posts.append(query)
    return sentence_posts




class PostViewSet(viewsets.GenericViewSet):
    
    authentication_classes = (ExpiringTokenAuthentication,)
    
    NOT_FOUND_JSON = {"detail": "Not Found"}
    MUST_BE_AUTHOR_OF_POST_JSON = {"detail": "You have to be the author to patch this post."}
    CONTENT_TO_SHORT_JSON = {"error": "Content too short."}

    serializer_class = PostSerializer


    def list(self, request):
        """
        Removed: Filter posts by its parent_object, be it blog, post, or sentence as determined by input pk
        Pagination is a little icky: ?blog=1?page=2

        TODO: Add this back, since we now know about urlparse
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

        # Handles cases like 404 and invalid page numbers!
        page = self.paginate_queryset(posts)
        if page is not None:
            #serializer = self.get_pagination_serializer(page)
            serializer = PostPaginationSerializer(page, context = {'request': request})
        else:
            serializer = self.get_serializer(posts, many=True, context = {'request': request})

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

        # Parse user input
        post_serializer = PostSerializer(data = request.DATA, context={'request': request})

        if not post_serializer.is_valid():
            # The user input was invalid
            return Response(post_serializer.errors, status = 400)

        # Serializer doesn't check for empty content since its IO is dynamic 
        content = request.DATA.get('content', None)
        if not content_is_not_empty(content):
            return Response({"error": "There was no content, refer to template for reference."}, status = 400)
       
       
        # If the post is made on a blog content type and the blog is RESTRICTED, 
        # perform special authorization checks:
        # A restricted blog means only users on the white list of the blog can post to it
        parent_ct_name = post_serializer.data['parent_content_type']

        # The content type is already validated by the is_valid call on the serializer
        blog = get_parent_blog_of_model(post_serializer.data['parent_content_type'], post_serializer.data['parent_id'])
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
        #sentences = Sentence.objects.filter(edition = creation_result['edition'])
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

        #if (content is None) or ( len(content) < 1 ):
        if not content_is_not_empty(content):
            return Response(self.CONTENT_TO_SHORT_JSON, status = 400)

        patch_result = patch_post(post, content)

        return_json = {}
        return_json['number_sentences'] = patch_result['number_sentences']
        return_json['number_merged'] = patch_result['number_merged']
        return_json['number_versions'] = len( Edition.objects.filter(parent = post) )
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
            
            # URL option to get versions(deleted )

            # TODO: the current serializer takes the most recent edition off the bat!
            #return_json['editions'] = len( post_editions )

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
    def comments(self, request, pk = None):
        return post_view(self, request, "post", pk)


    @action(methods=['GET'])
    def sentence_comments(self, request, pk = None):
        try:
            pk = int(pk)
        except ValueError:
            raise Http404("Post doesn't exist")

        post = Post.objects.get(pk = pk)

        # expect Edition to be ordered by date
        edition = Edition.objects.filter(parent = post)[0]
        sentences = Sentence.objects.filter(edition = edition).values('pk')

        sentence_ct = ContentType.objects.get(model = 'sentence')

        comments = Post.objects.filter(parent_content_type = sentence_ct, parent_id__in = sentences)

        page = self.paginate_queryset(comments)
        serialized = PostPaginationSerializer(page, context = {'request': request})

        return Response(serialized.data, status = 200)