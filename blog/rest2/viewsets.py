from django.contrib.auth.models import User
from rest_framework import viewsets, mixins, status, reverse
from rest_framework.response import Response
from rest_framework.decorators import action, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated, IsAuthenticatedOrReadOnly
from django.contrib.contenttypes.models import ContentType
from blog.rest2.sessions import ExpiringTokenAuthentication
from django.conf import settings
from django.db import IntegrityError
from django.http import Http404

import json
from blog.rest2.serializers import *
from blog.models import *


from blog import parser
import nltk
import difflib


class PaginationError(Exception):
    pass


def build_collection_json_from_query(request, query_set, per_model_serializer_callback):
    """
    Builds a skeleton collection data structure to be used for JSON serialization.
    Sets up pagination and links.

    Returns a json that can be further edited (such as template, debug properties)

    Throws PaginationError on cases 
    1) page parameter is not an int
    2) page is out of bounds (too low or too high)

    @per_model_serializer_callback A callback to be used to serialize a model of the query_set to a python dict
    The callback takes a single argument which is the singular django model of the query_set.
    """
    # Pagination:
    # For queries returning large number of items
    # show only a subset of the items with an upper bound limit to size
    # as determined by settings
    # User can offer a page parameter to provide an offset
    # Paginate by settings.REST_FRAMEWORK['PAGINATE_BY']
    try:
        page = int( request.GET.get('page', 1) )
    except ValueError:
        raise PaginationError()

    page_size = settings.REST_FRAMEWORK['PAGINATE_BY']
    offset = ( (page - 1) * page_size )

    # Get the query set size and check if pagination is valid
    size = len( query_set )

    # Check if offset is not too low
    # To check of offset is too high
    if (offset < 0) or (offset > size):
        raise PaginationError()


    result_set = query_set[offset : offset+page_size]


    return_json = {}
    return_json['collection'] = {}
    return_json['collection']['version'] = 1.0

    return_json['collection']['href'] = '%s' % (request.build_absolute_uri(""),)

    return_json['collection']['links'] = []

    # Display next link if offset + page_size is still less than size of result_set
    # len(result_set) vs page_size
    if offset + page_size < size:
        return_json['collection']['links'].append( {'rel': 'next', 'href': request.build_absolute_uri().split("?")[0] + ('?page=%s' % (page + 1,))} )

    if offset > 1:
        return_json['collection']['links'].append( {'rel': 'prev', 'href': request.build_absolute_uri().split("?")[0] + ('?page=%s' % (page - 1,))} )

    # This will have to be set on case by case basis
    return_json['collection']['template'] = {}

    return_json['collection']['size'] = size
    return_json['collection']['items'] = []

    for q in result_set:
        return_json['collection']['items'].append( per_model_serializer_callback(q) )

    return_json['debug'] = {}
    return_json['debug']['offset'] = offset
    return_json['debug']['page_size'] = page_size
    return_json['debug']['size'] = size

    return return_json




class UserViewSet(viewsets.GenericViewSet, 
                  mixins.ListModelMixin, 
                  mixins.RetrieveModelMixin, 
                  mixins.UpdateModelMixin):
    authentication_classes = (ExpiringTokenAuthentication,)
    queryset = User.objects.all()
    serializer_class = UserSerializer
    lookup_field = 'username'

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return BasicUserSerializer
        else:
            return UserSerializer

    def create(self, request):
        serializer = UserSerializer(data = request.DATA, files = request.FILES, context = {'request': request})
        if serializer.is_valid():
            try:
                user = User.objects.create_user(username = serializer.object.username, 
                                                email = serializer.object.email, 
                                                password = serializer.object.password,
                                                first_name = serializer.object.first_name,
                                                last_name = serializer.object.last_name)

                #location_header = reverse('user-detail', kwargs = {'username': user.username})
                user.save()
                serializer.object = user
                return Response(serializer.data, status = status.HTTP_201_CREATED)
            except IntegrityError as e:
                return Response({"error": "Something went wrong"}, status = status.HTTP_409_CONFLICT)
        else:
            return Response(serializer.errors, status = status.HTTP_400_BAD_REQUEST)
        # if serializer.is_valid():
        #     user = User.objects.create_user(serializer.object.username, 
        #                                     serializer.object.email, 
        #                                     serializer.object.password)
        #     user.first_name = serializer.object.first_name
        #     user.last_name = serializer.object.last_name
            
        #     self.pre_save(serializer.object)
        #     user.save()
        #     serializer.object = user
        #     self.post_save(serializer.object, created = True)
            
        #     return_url = reverse('user-detail', kwargs = {'username': 'username'}, request = request)
            
        #     return Response(serializer.data, 
        #                     status = status.HTTP_201_CREATED, 
        #                     headers = {'Location': return_url})    
        # else:
        #     return Response(serializer.errors, status = status.HTTP_400_BAD_REQUEST)  
    
    @action(permission_classes=[IsAuthenticated])
    def set_password(self, request, pk = None):
        user = self.get_object()
        serializer = UserSerializer(data = request.DATA, files = request.FILES)
        if serializer.is_valid():
            user.set_password(serializer.data['password'])
            user.save()
            return Response({'status': 'Password Set'})
        else:
            return Response(serializer.errors, status = status.HTTP_400_BAD_REQUEST)
    
    @permission_classes((IsAdminUser, ))
    def destroy(self, request, username = None):
        obj = User.objects.get(username = username)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


def post_view(model_name, request, pk):
    try:
        pk = int(pk)
    except:
        return Response({"detail": "Not found"}, status = 404)

    query = Post.objects.filter(parent_content_type = ContentType.objects.get(model = model_name), parent_id = pk).order_by('-created')

    try:
        return_json = build_collection_json_from_query(request, query, lambda m: {"id": m.id, "title": m.title, "href": '/blog/api/posts/%s' % (m.id,)})
    except PaginationError:
        return Response({"detail": "Not found"}, status = 404)

    return Response( return_json, status = 200 )


class BlogViewSet(viewsets.GenericViewSet, 
                  mixins.CreateModelMixin,
                  mixins.ListModelMixin, 
                  mixins.RetrieveModelMixin, 
                  mixins.UpdateModelMixin):
    authentication_classes = (ExpiringTokenAuthentication,)
    queryset = Blog.objects.all()
    serializer_class = BlogSerializer

    def create(self, request):
        if request.user is None:
            return Response({"detail": "Authorization required"}, status = 401)
        blog_serializer = BlogSerializer(data = request.DATA)
        if blog_serializer.is_valid():
            try:
                new_blog = Blog.objects.create(title = blog_serializer.object.title, creator = request.user)
                return Response({"status": "Created: %s" % (blog_serializer.object.title,)}, status = 201)
            except IntegrityError:
                return Response({"error": "A blog with that name already exists."}, status = 409)
        else:
            return Response(blog_serializer.errors, status = 400)

    @action(methods=['GET'])
    def posts(self, request, pk = None):
        return post_view("blog", request, pk)


class PostViewSet(viewsets.GenericViewSet):
    
    authentication_classes = (ExpiringTokenAuthentication,)
    
    NOT_FOUND_JSON = {"detail": "Not Found"}
    MUST_BE_AUTHOR_OF_POST_JSON = {"detail": "You have to be the author to patch this post."}
    CONTENT_TO_SHORT_JSON = {"error": "Content too short."}

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

        Filter posts its parent_object, be it blog, post, or sentence as determined by input pk
        """
        blog_pk = request.GET.get('blog', None)
        post_pk = request.GET.get('post', None)
        sentence_pk = request.GET.get('sentence', None)

        try:
            parent_content_type = None

            if blog_pk is not None:
                parent_content_type = ContentType.objects.get(name = 'blog')
                parent_id = int(blog_pk)
            elif post_pk is not None:
                parent_content_type = ContentType.objects.get(name = 'post')
                parent_id = int(post_pk)
            elif sentence_pk is not None:
                parent_content_type = ContentType.objects.get(name = 'sentence')
                parent_id = int(sentence_pk)
            else:
                # Everything is none
                posts = Post.objects.all()
        except ValueError:
            return Response(self.NOT_FOUND_JSON, status = 404)                

        if parent_content_type is not None:
            posts = Post.objects.filter(parent_content_type = parent_content_type, parent_id = parent_id).order_by('-created')

        if len(posts) < 1:
            return Response(self.NOT_FOUND_JSON, status = 404)

        serialized_posts = PostSerializer(posts, many = True, context = {'request': request})
        return Response( serialized_posts.data, status = 200 )

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


class SentenceViewSet(viewsets.GenericViewSet):
    
    def list(self, request):
        pagination = request.GET.get('page', None)
        if pagination is not None:
            limit = pagination
        else:
            pagination = 16
        sentences = Sentence.objects.all()[:pagination]

        return_json = []
        for sentence in sentences:
            payload = {'id': sentence.pk, \
                         'text': sentence.text.value, \
                         'post': sentence.sentence_set.parent.id, \
                         'ordering': sentence.ordering}
            
            payload['href'] = '/api/sentences/%s'  % (sentence.pk,)
            if sentence.previous_version is not None:
                payload['previous_version'] = sentence.previous_version.pk
            
            return_json.append( payload )

        return Response(return_json, status = 200)

    def retrieve(self, request, pk = None):
        try:
            pk = int(pk)
        except:
            return Response({"detail": "Not found"}, status = 404)

        sentence = Sentence.objects.get(pk = pk)
        # previous_version
        # sentence_set
        # text 
        # ordering
        return_json = {'id': sentence.pk, \
                       'text': sentence.text.value, \
                       'post': sentence.sentence_set.parent.id, \
                       'ordering': sentence.ordering}

        if sentence.previous_version is not None:
            return_json['previous_version'] = sentence.previous_version.pk

        return Response(return_json, status = 200)

    @action(methods=['GET'])
    def posts(self, request, pk = None):
        return post_view("sentence", request, pk)