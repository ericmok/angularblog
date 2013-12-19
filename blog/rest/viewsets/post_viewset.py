from django.contrib.auth.models import User
from rest_framework import viewsets, mixins, status, reverse
from rest_framework.response import Response
from rest_framework.decorators import action, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated, IsAuthenticatedOrReadOnly
from django.contrib.contenttypes.models import ContentType


from blog.rest.sessions import ExpiringTokenAuthentication
from blog.rest import sessions
from blog.rest import serializers


from django.db import IntegrityError
from django.http import Http404

import json
from blog.rest.viewsets.common import PaginationError, build_collection_json_from_query, post_view
from blog.rest.serializers import PostSerializer
from blog.models import *


from blog import parser
import nltk
import difflib

class PostViewSet(viewsets.GenericViewSet):
    
    authentication_classes = (ExpiringTokenAuthentication,)
    
    NOT_FOUND_JSON = {"detail": "Not Found"}
    MUST_BE_AUTHOR_OF_POST_JSON = {"detail": "You have to be the author to patch this post."}
    CONTENT_TO_SHORT_JSON = {"error": "Content too short."}

    serializer_class = PostSerializer

    def create_or_get_text(self, text_string):
        try: 
            text_obj = Text.objects.get(value = text_string)
        except:
            text_obj = Text.objects.create(value = text_string)
        return text_obj

    def list(self, request):
        """
        TODO:
        Can I add a template field?

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
            serializer = self.get_pagination_serializer(page)
        else:
            serializer = self.get_serializer(posts, many=True)

        serializer.data['template'] = [
            {"post": [
                {"title": "(String) Title of the post"},
                {"parent_content_type": "(String) Either 'blog', 'post', or 'sentence' representing the parent"},
                {"parent_id": "(Number) id of the parent"},
                {"content": "(String) The body of the post consisting of multiple sentences."}
            ]},
            {"patch": [
                {"content": "(String) The body of the post consisting of multiple sentences."}
            ]}
        ]
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
        The request is authenticated via the authentication class. 
        TODO:
        It should be assumed that the 'author' of a post is request.user!!!
        """
        #content_type = request.META.get('CONTENT_TYPE', None) 
        #if content_type == 'application/json' or content_type == 'text/javascript':
        #    data = 

        # Parse user input
        post_serializer = PostSerializer(data = request.DATA, context={'request': request})

        # Preconditions:
        # User is authenticated, either via tokens or cookie sessions
        # The author *is* the user 
        # if request.user != post_serializer.object['author']:
        #    return Response({'error': 'You are not logged in as the given author'}, status = 401)
        # Title is not null
        # Parent object exists <- This is checked in serializer validation
        # Content can be empty or a string containing multiple sentences. 
        # 
        # The post is created before content is validated...?
        # There are no validations on sentences...
        #
        # If there is content, parse it (ie. an essay) into sentences via NLTK punkt.
        # Create sentences for each sentence
        if post_serializer.is_valid():

            # Create a new post
            new_post = Post.objects.create(title = post_serializer.data['title'], author = request.user)

            # Get the object that the parent_content_type and parent_id fields point to
            parent = ContentType.objects.get(model = post_serializer.data['parent_content_type'])
            parent = parent.get_object_for_this_type(pk = post_serializer.data['parent_id'])
            new_post.parent_object = parent

            new_post.save() # Save after editing the parent field, modified field will change again

            # Create a brand new set for the post. It is time stamped on creation
            new_set = SentenceSet.objects.create(parent = new_post)

            print("DATA:")
            print(request.DATA)

            if request.DATA.get('content', None) is not None:
                detector = nltk.load('tokenizers/punkt/english.pickle')
                sentences = detector.tokenize( request.DATA['content'] )

                return_json = { "sentences": [] }

                for index, value in enumerate(sentences):
                    # Since index starts at 0, increment to get 1

                    # For each sentence, create or get text
                    #try: 
                    #    text_obj = Text.objects.get(value = value)
                    #except:
                    #    text_obj = Text.objects.create(value = value)
                    text_obj = self.create_or_get_text(value)

                    # Forge a binary relation between the created text and the set
                    new_sentence = Sentence.objects.create(sentence_set = new_set, text = text_obj, ordering = index + 1)
                    return_json['sentences'].append({"id": new_sentence.pk, "text": value, "ordering": index + 1})

                return_json['number_sentences'] = len(sentences)
                return Response(return_json, status = 201)

            return Response({"status": "Success!"}, status = 201)
        else:
            # If user input was invalid
            return Response(post_serializer.errors, status = 400)


    def note(self, str):
        #print(str)
        pass

    def partial_update(self, request, pk = None):
        """
        Preconditions:
        User is logged in. 

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
        """
        try:
            pk = int(pk)
        except ValueError:
            return Response(self.NOT_FOUND_JSON, status = 404)

        # Test if post with pk exists
        try:
            post = Post.objects.get(pk = pk)
        except Post.DoesNotExist:
            return Response(self.NOT_FOUND_JSON, status = 404)

        # Test if post author is the user
        if post.author != request.user:
            return Response(self.MUST_BE_AUTHOR_OF_POST_JSON, status = 401)


        # Check the integrity of the content
        content = request.DATA.get('content', None)
        if (content is None) or ( len(content) < 1 ):
            return Response(self.CONTENT_TO_SHORT_JSON, status = 400)

        # Throttle?

        # Loop through the content
        detector = nltk.load('tokenizers/punkt/english.pickle')
        new_sentences = detector.tokenize(content)

        self.note('%s' % new_sentences)

        # Get sentences of the lastest version
        try:
            latest_version = SentenceSet.objects.filter(parent = post)[0]
        except Exception as e:
            return Response({"error": str(e)}, status = 500)

        # This query is ordered by ordering
        #existing_sentences = Sentence.objects.filter(sentence_set = latest_version)
        existing_sentences = latest_version.sentences.all()

        self.note("SentenceSet")
        self.note("%s %s" % (latest_version.pk, latest_version))
        

        self.note("existing")
        self.note(existing_sentences)

        existing_sentences_text = [ sentence.text for sentence in existing_sentences ]
        existing_sentences_text_value = [ text.value for text in existing_sentences_text ]
        
        self.note("OLD TEXTS")
        self.note(existing_sentences_text)
        self.note(existing_sentences_text_value)
        self.note("--")

        new_set = SentenceSet.objects.create(parent = post)

        # Count the number of merged sentences. 
        # This is incremented for every match found as we iterate over the new_sentences
        similarity_counter = 0

        # Loop through new sentences, create new sentences
        # Set the previous_version pointer if there is a match
        for ordering_index, new_text in enumerate(new_sentences):

            # Gets the closest string to the new string
            match = difflib.get_close_matches(new_text, existing_sentences_text_value, n = 1, cutoff = 0.4)

            self.note("new_text: " + str(new_text))
            self.note("Close Matches: " + str( match ))
            

            # Create new Text for each new_text 
            # Then create new Setence for each new_text
            #try: 
            #    self.note("Creating new text object")
            #    text = Text.objects.create(value = new_text)
            #except IntegrityError as ie:
            #    # If duplicate don't create text object
            #    self.note("Getting old text object %s" % (ie))
            #    text = Text.objects.get(value = new_text)
            text = self.create_or_get_text(new_text)


            if len( match ) < 1:
                # If there is no match, don't set the previous_version pointer
                self.note("no match")
                new_sentence = Sentence.objects.create(sentence_set = new_set, \
                                                        text = text, \
                                                        ordering = ordering_index + 1)
            else:                 
                # There was a match! 
                # Set the previous_version pointer so that the new sentence has a reference
                # to the old sentence
                # 
                # Since difflib returns only the closest old sentence as a string 
                # We need to find the Sentence model that represents the string
                #
                # Since the existing strings are cached, do a linear search in RAM instead
                # of a query
                similarity_counter += 1

                for index_representing_the_model, string_value_to_compare in enumerate(existing_sentences_text_value):
                    if string_value_to_compare == match[0]:
                        self.note("match")
                        previous_version = existing_sentences[index_representing_the_model]
                        new_sentence = Sentence.objects.create(sentence_set = new_set, \
                                                                text = text, \
                                                                ordering = ordering_index + 1, \
                                                                previous_version = previous_version)

        return_json = {}
        return_json['number_sentences'] = len(new_sentences)
        return_json['number_merged'] = similarity_counter
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

            #for version in post_versions:
            #    return_json['versions'].append( version.pk )

            return_json["sentences"] = []

            # ordered by ordering
            sentences = Sentence.objects.filter(sentence_set = current_version)

            for sentence in sentences:
                return_json['sentences'].append({"id": sentence.pk, "text":sentence.text.value, "ordering": sentence.ordering, "previous_version": sentence.previous_version})

            # Response 
            return Response(return_json, status = 200)
        except Post.DoesNotExist as dne:
            return Response(self.NOT_FOUND_JSON, status = 404)

    @action(methods=['GET'])
    def posts(self, request, pk = None):
        return post_view("post", request, pk)