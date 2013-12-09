from django.contrib.auth.models import User, Group
from django.contrib.contenttypes.models import ContentType

from django.shortcuts import get_object_or_404

from rest_framework import serializers, viewsets, routers
from rest_framework.response import Response

from rest_framework import mixins, status, reverse
from rest_framework.decorators import action, permission_classes

from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from django.core.urlresolvers import NoReverseMatch

from rest_framework.reverse import reverse

import re

from rest_framework.serializers import Field

from blog.rest.posts import BasicPostSerializer





class UserSerializer(serializers.HyperlinkedModelSerializer):
    
    href = serializers.HyperlinkedIdentityField(view_name = 'user-detail', lookup_field = 'username')

    class Meta:
        model = User
        fields = ('id', 'href', 
                  'username', 'password',
                  'email', 
                  'first_name', 'last_name',

                  'is_staff', 'is_active', 
                  'date_joined', 'last_login',)
        
        read_only_fields = ('is_staff', 'is_active',
                            'date_joined', 'last_login')
        
        lookup_field = 'username'



class UserViewSet(viewsets.GenericViewSet, 
                  mixins.ListModelMixin, 
                  mixins.RetrieveModelMixin, 
                  mixins.UpdateModelMixin):
    
    queryset = User.objects.all()
    serializer_class = UserSerializer
    lookup_field = 'username'

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return BasicUserSerializer
        else:
            return UserSerializer
    
    def create(self, request):
        serializer = UserSerializer(data = request.DATA, files = request.FILES)
        
        if serializer.is_valid():
            user = User.objects.create_user(serializer.object.username, 
                                            serializer.object.email, 
                                            serializer.object.password)
            user.first_name = serializer.object.first_name
            user.last_name = serializer.object.last_name
            
            self.pre_save(serializer.object)
            user.save()
            serializer.object = user
            self.post_save(serializer.object, created = True)
            
            return_url = reverse('user-detail', kwargs = {'username': 'username'}, request = request)
            
            return Response(serializer.data, 
                            status = status.HTTP_201_CREATED, 
                            headers = {'Location': return_url})    
        else:
            return Response(serializer.errors, status = status.HTTP_400_BAD_REQUEST)  
    
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

