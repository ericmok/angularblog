from blog.models import Sentence, Post, Blog

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


    
class BlogSerializer(serializers.HyperlinkedModelSerializer):

    #creator = serializers.HyperlinkedRelatedField(view_name = 'user-detail', lookup_field = 'username',  source='creator')
    ##author = serializers.CharField(max_length = 64)
    creator = serializers.SlugRelatedField(slug_field = 'username')
    href = serializers.HyperlinkedIdentityField(view_name = 'blog-detail')
    #creator = BasicUserSerializer()

    content_type = serializers.Field(source = 'content_type')

    class Meta:
        #depth = 1
        model = Blog
        fields = ('content_type', 'id', 'href', 
                  'title', 'creator',
                  'created')
        

class BlogViewSet(viewsets.ModelViewSet): 

    queryset = Blog.objects.all()
    serializer_class = BlogSerializer