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


class BasicUserSerializer(serializers.HyperlinkedModelSerializer):

    href = serializers.HyperlinkedIdentityField(view_name = 'user-detail', lookup_field = 'username')
    

    class Meta:
        model = User
        fields = ('href', 'username', 
                  'date_joined', 'last_login')
        lookup_field = 'username'


class PostParentGenericHyperlinkedField(serializers.RelatedField):
    """
    A URL is a JSON type of string. Convert string to URL.
    """
    # TODO: Given an url need to find the right serializer

    def to_native(self, obj):
        """
        Converts Post object <specified as the model to use in ModelSerializer>
        and converts it to a simple primitive
        """
        #return "%s" % (obj.name) 
        print("TO NATIVE");

        if isinstance(obj, Blog):
            serializer = BlogSerializer(obj)
        if isinstance(obj, Post):
            serializer = PostSerializer(obj)
        if isinstance(obj, Sentence):
            serializer = SentenceSerializer(obj)
        else:
            raise Exception("Unexpected type of tagged object")
        
        return serializer.data

    def from_native(self, value):
        """
        Converts simple primitive <string> to object <ContentType>
        This logic should really be in the serializer validation logic
        """
        print("FROM NATIVE")
        regex = "(?P<model>[^\/]*)/(?P<pk>[^\/]*)/?$"
        model_name = re.search(regex, value).group(1)
        primary_key = re.search(regex, value).group(2)
        model = ContentType.objects.get(name = model_name)
        obj = model.objects.get_object_for_this_type(pk = primary_key)
        return obj



class BasicPostSerializer(serializers.HyperlinkedModelSerializer):
    href = serializers.HyperlinkedIdentityField(view_name='post-detail')
    author = BasicUserSerializer()

    class Meta:
        #depth = 1
        model = Post

class PostSerializer(serializers.HyperlinkedModelSerializer):
    
    # TODO: Change this to UserSerializer
    author = serializers.SlugRelatedField(slug_field = 'username')

    #author = BasicUserSerializer()
    #author = serializers.HyperlinkedRelatedField(view_name = 'user-detail', lookup_field = 'username')

    #ordering = serializers.CharField(max_length = 1024, source='ordering', required = False)
    parent_id = serializers.IntegerField(source = 'parent_id', required = False)
    parent_content_type = serializers.CharField(max_length = 32, source='parent_content_type', required = False)
    
    href = serializers.HyperlinkedIdentityField(view_name = 'post-detail')

    content_type = serializers.Field(source = 'content_type')

    def validate_parent_content_type(self, attrs, source):
        
        # Only test parent_content_type if parent_id is given
        #if attrs[source] and attrs['parent_id']:
        if not attrs['parent_content_type']:
            attrs['parent_content_type'] = None
            return attrs
        
        if attrs['parent_content_type'] != 'sentence' and attrs['parent_content_type'] != 'post' and attrs['parent_content_type'] != 'blog':
            raise serializers.ValidationError("Parent Content Type not valid choice.")
        #else:
        #attrs[source] = None
            
        return attrs
    
    #def validate_author(self, attrs, source):
    #    try:
    #        attrs[source] = User.objects.get(username = attrs[source])
    #        return attrs
    #    except Exception:
    #        raise serializers.ValidationError("Username not found")
                
    
    def validate(self, attrs):
        print("validate" + str(attrs) )
        
        if attrs['parent_content_type'] and not attrs['parent_id']:
            raise serializers.ValidationError("Must include parent_id if including parent_content_type")
        
        # This is not getting reached
        elif attrs['parent_id'] and not attrs['parent_content_type']:
            raise serializers.ValidationError("Must include parent_content_type if including parent_id")

        # If no parent object id, then don't look for parent object...
        if attrs['parent_id'] is None:
            return attrs
    
        try:
            attrs['parent_content_type'] = ContentType.objects.get(name = attrs['parent_content_type'])
            attrs['parent_object'] = attrs['parent_content_type'].get_object_for_this_type(id = attrs['parent_id'])
        except:
            raise serializers.ValidationError("Object of parent id not found.")
            
        return attrs
    
    class Meta:
        model = Post
        fields = ('content_type', 'id', 'href',
                  'author', 
                  'created', 'modified',
                  'parent_content_type', 'parent_id')

        read_only_fields = ('created', 'modified',)
        
        #depth = 1

    
############
## TODO: Editing generic foreign key not working?
############
class PostViewSet(viewsets.GenericViewSet, 
                  mixins.ListModelMixin,
                  
                  mixins.DestroyModelMixin):
    
    queryset = Post.objects.all()
    serializer_class = PostSerializer
    
    def create(self, request):
        serializer = self.get_serializer(data = request.DATA, files = request.FILES)
        
        if serializer.is_valid():
            #print(serializer.data)
            #serializer.data['parent_content_type'] = ContentType.objects.get(name = serializer.data['parent_content_type'])
            #pk = serializer.data['parent_id']
            #serializer.data['parent_content_type'].get_object_for_this_type(id = serializer.data['pk'])
            serializer.save()
            return Response(serializer.data, status = status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status = status.HTTP_400_BAD_REQUEST)
    
    #def retrieve(self, request, pk = None):
    #    post = get_object_or_404(self.queryset, pk = pk)
    #    serializer = self.serializer_class(post)
        
    #    if serializer.is_valid():
    #        return Response(serializer.data, status = status.HTTP_200_OK)
    #    else:
    #        return Response(serializer.data, status = status.HTTP_404_NOT_FOUND)

    @action(methods=['GET'])
    def get_sentences(self, request, pk=None):
        try:
            sentences = Sentence.objects.filter(post = pk)
            #print("Sentences: " + str(sentences))
            sentences = SentenceSerializer(sentences, context = {'request': request}, many = True)
            sentences.is_valid()
            return Response(sentences.data, status = status.HTTP_200_OK)
        except Exception as e:
            print("ERROR: " + str(e))
            return Response({'status': 'Not found.'}, status = status.HTTP_404_NOT_FOUND)
   
