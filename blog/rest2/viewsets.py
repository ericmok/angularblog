from django.contrib.auth.models import User
from rest_framework import viewsets, mixins, status, reverse
from rest_framework.response import Response
from rest_framework.decorators import action, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated, IsAuthenticatedOrReadOnly

from blog.rest2.sessions import ExpiringTokenAuthentication

from django.db import IntegrityError

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
    def list(self, request):
        return Response({"TODO": True}, status = 200)