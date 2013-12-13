from django.contrib.auth.models import User
from rest_framework import viewsets, mixins, status, reverse
from rest_framework.response import Response
from rest_framework.decorators import action, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated, IsAuthenticatedOrReadOnly
from django.contrib.contenttypes.models import ContentType
from blog.rest2.sessions import ExpiringTokenAuthentication

from django.db import IntegrityError

import json
from blog.rest2.serializers import *

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
                return Response({"Error": "Something went wrong"}, status = status.HTTP_409_CONFLICT)
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

class BlogViewSet(viewsets.GenericViewSet, 
                  mixins.CreateModelMixin,
                  mixins.ListModelMixin, 
                  mixins.RetrieveModelMixin, 
                  mixins.UpdateModelMixin):
    authentication_classes = (ExpiringTokenAuthentication,)
    queryset = Blog.objects.all()
    serializer_class = BlogSerializer


class PostViewSet(viewsets.GenericViewSet):
    
    authentication_classes = (ExpiringTokenAuthentication,)
    
    def list(self, request):
        """
        TODO:
        Can I add a template field?
        """
        posts = Post.objects.all()
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

            from blog import parser

            print("DATA:")
            print(request.DATA)
            if request.DATA.get('content', None) is not None:
                import nltk
                detector = nltk.load('tokenizers/punkt/english.pickle')
                sentences = detector.tokenize( request.DATA['content'] )

                return_json = { "sentences": [] }

                for index, value in enumerate(sentences):
                    # Since index starts at 0, increment to get 1
                    created = Sentence.objects.create(text = value, ordering = index + 1, post = new_post)
                    return_json['sentences'].append({"id": created.pk, "text": value, "ordering": index + 1})

                return_json['number_sentences'] = len(sentences)
                return Response(return_json, status = 201)

            return Response({"status": "Success!"}, status = 201)
        else:
            # If user input was invalid
            return Response(post_serializer.errors, status = 400)


    def partial_update(self, request, pk = None):
        return Response({"status": "TODO"}, status = 200)

    def retrieve(self, request, pk = None):
        try:
            pk = int(pk)
        except ValueError:
            return Response({"detail": "Not found"}, status = 404)

        try:
            # Get Post
            post = Post.objects.get(pk = pk)

            # Encode post as JSON
            serialized_post = PostSerializer(post, context={'request':request})
            return_json = serialized_post.data

            # Show sentences as an array of pks
            sentences = Sentence.objects.filter(post = post)
            return_json['sentences'] = []
            for sentence in sentences:
                return_json['sentences'].append( sentence.pk )

            # Response 
            return Response(return_json, status = 200)
        except Post.DoesNotExist as dne:
            return Response({"detail": "Not found"}, status = 404)
