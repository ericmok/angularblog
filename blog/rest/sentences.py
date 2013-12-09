
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

class SentenceSerializer(serializers.HyperlinkedModelSerializer):
    
    href = serializers.HyperlinkedIdentityField(view_name = 'sentence-detail')
    #post = BasicPostSerializer()
    #post = serializers.HyperlinkedRelatedField(view_name = 'post-detail'

    post = serializers.PrimaryKeyRelatedField()

    content_type = serializers.Field(source = 'content_type')

    class Meta:
        #depth = 1
        model = Sentence
        fields = ('content_type', 'id', 'href', 
                  'created', 'post', 'ordering', 'text',)
        read_only_fields = ('created', 'ordering')


class SentenceViewSet(viewsets.ModelViewSet):
    
    queryset = Sentence.objects.all()
    serializer_class = SentenceSerializer
    