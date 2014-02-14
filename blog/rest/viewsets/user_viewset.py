from django.contrib.auth.models import User
from rest_framework import viewsets, mixins, status, reverse
from rest_framework.response import Response
from rest_framework.decorators import action, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated, IsAuthenticatedOrReadOnly
from django.contrib.contenttypes.models import ContentType

from django.db import transaction

from blog.rest.sessions import ExpiringTokenAuthentication
from blog.rest import sessions
from blog.rest import serializers
from rest_framework.permissions import IsAuthenticated, AllowAny

from django.db import IntegrityError
from django.http import Http404

import json
from blog.rest.serializers import UserSerializer, BasicUserSerializer, UserPaginationSerializer
from blog.models import *

from blog.rest.viewsets.common import PaginationError, build_collection_json_from_query, post_view, hash_cash_check


class UserViewSet(viewsets.GenericViewSet, 
                  mixins.ListModelMixin, 
                  mixins.RetrieveModelMixin):
    authentication_classes = (ExpiringTokenAuthentication,)
    
    permission_classes = (AllowAny,)
    queryset = User.objects.all()
    serializer_class = UserSerializer
    lookup_field = 'username'

    pagination_serializer_class =  UserPaginationSerializer

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return BasicUserSerializer
        else:
            return UserSerializer


    def create(self, request):
        #unique = request.META.get('HTTP_X_UNIQUE', None)
        unique = request.META.get('HTTP_UNIQUE', None)
        
        # Unique header exists?
        if unique is None:
            return Response({'error': 'Proof of work missing'}, status = 400)
        else:
            # Unique header contains 3 tokens?
            tokens = unique.split()
            
            if len(tokens) != 3:
                return Response({'error': 'Proof of work header requires 3 tokens'}, status = 400)
            
            # First token of header is a field in the data?
            key = request.DATA.get(tokens[0], None)
            if key is None:
                return Response({'error': 'Proof of work for field not valid'}, status = 400)
            
            counter = tokens[1]
            hash_value = tokens[2]
            
            # Verification
            result = hash_cash_check(key, counter, hash_value)
            
            if result is False:
                return Response({'error': 'Proof of work failed'}, status = 400)
        
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
    
    #@permission_classes(IsAdminUser,)
    def destroy(self, request, username = None):
        
        if request.user.username == 'eric':
            obj = User.objects.get(username = username)
            obj.delete()
            return Response({}, status=status.HTTP_204_NO_CONTENT)
        else:
            return Response({"error": "Cannot delete unless superuser"}, status = 401)


