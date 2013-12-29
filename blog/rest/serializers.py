from blog.models import User, Blog, Post, Sentence
from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType
from rest_framework.pagination import BasePaginationSerializer, NextPageField, PreviousPageField
import re
from django.http import QueryDict

class BasicUserSerializer(serializers.ModelSerializer):
    href = serializers.HyperlinkedIdentityField(view_name = 'user-detail', lookup_field = 'username')

    class Meta:
        model = User
        fields = ('id', 'href', 'username', 'date_joined',)
        lookup_field = 'username'

class UserSerializer(serializers.ModelSerializer):
    href = serializers.HyperlinkedIdentityField(view_name = 'user-detail', lookup_field = 'username')

    def validate_password(self, attrs, source):
      if len( attrs['password'] ) < 5:
        raise serializers.ValidationError("Password needs to be at least 5 characters")
      else:
        return attrs

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




class BlogSerializer(serializers.ModelSerializer):
  href = serializers.HyperlinkedIdentityField(view_name = 'blog-detail')
  white_list = serializers.Field(source = 'get_whitelisted')

  creator = serializers.SlugRelatedField(slug_field = 'username')

  def validate_title(self, attrs, source):
    title = attrs.get('title', None)
    if title is None:
        raise serializers.ValidationError("Title cannot be empty")
    else:
        if re.search('[^a-zA-Z0-9 ]', title) is None:
            return attrs
        else:
            raise serializers.ValidationError("Title can only contain alphanumeric characters and spaces") 

  class Meta:
    model = Blog
    fields = ('id', 'href', 'title', 'created', 'is_restricted')
    #read_only_fields = ('creator',)



class BlogPaginationSerializer(BasePaginationSerializer):
    """
    A default implementation of a pagination serializer.
    """
    #results_field = 'blogs'
    count = serializers.Field(source='paginator.count')
    next = NextPageField(source='*')
    previous = PreviousPageField(source='*')

    class Meta:
        object_serializer_class = BlogSerializer



class PostSerializer(serializers.HyperlinkedModelSerializer):
    
    author = serializers.SlugRelatedField(slug_field = 'username', read_only = True)

    parent_id = serializers.IntegerField(source = 'parent_id', required = True)
    parent_content_type = serializers.CharField(max_length = 32, source='parent_content_type', required = True)
    
    href = serializers.HyperlinkedIdentityField(view_name = 'post-detail')

    content_type = serializers.Field(source = 'content_type')

    #brief = serializers.Field(source = 'get_brief')


    def validate_parent_content_type(self, attrs, source):
        if attrs.get('parent_content_type', None) is None:
            return attrs

        if attrs['parent_content_type'] != 'sentence' and attrs['parent_content_type'] != 'post' and attrs['parent_content_type'] != 'blog':
            raise serializers.ValidationError("Parent Content Type not valid choice.")
        return attrs
    
    #def validate_author(self, attrs, source):
    #    if attrs.get(source, None) is None:

    #    try:
    #        attrs[source] = User.objects.get(username = attrs[source])
    #        return attrs
    #    except User.DoesNotExist:
    #        raise serializers.ValidationError("Username not found")
                
    def validate(self, attrs):
        try:
            attrs['parent_content_type'] = ContentType.objects.get(name = attrs['parent_content_type'])
            attrs['parent_object'] = attrs['parent_content_type'].get_object_for_this_type(id = attrs['parent_id'])
        except:
            raise serializers.ValidationError("Object of parent id not found.")
            
        return attrs
    
    class Meta:
        model = Post
        fields = ('content_type', 'id', 'href', 'title', 'author',
                  'created', 'modified',
                  'parent_content_type', 'parent_id')

        read_only_fields = ('created', 'modified',)
        
        #depth = 1


class PostPaginationSerializer(BasePaginationSerializer):
    """
    A default implementation of a pagination serializer.
    """
    #results_field = 'posts'
    count = serializers.Field(source='paginator.count')
    next = NextPageField(source='*')
    previous = PreviousPageField(source='*')
    
    class Meta:
        object_serializer_class = PostSerializer


class WhiteListSerializer(serializers.ModelSerializer):
    user = serializers.SlugRelatedField(slug_field = 'username')
    blog = serializers.SlugRelatedField(slug_field = 'title')

    class Meta:
        fields = ('user', 'blog')

class UserPaginationSerializer(BasePaginationSerializer):
    """
    A default implementation of a pagination serializer.
    """
    #results_field = 'users'
    count = serializers.Field(source='paginator.count')
    next = NextPageField(source='*')
    previous = PreviousPageField(source='*')

    class Meta:
        object_serializer_class = BasicUserSerializer



def serialize_sentence(sentence):
    return_json = {
        "id": sentence.pk, 
        "text": sentence.text.value, 
        "ordering": sentence.ordering,
        "mode": sentence.mode,
        "paragraph": sentence.paragraph.index,
        "number_replies": sentence.number_children
        }
    if (sentence.previous_version is not None):
        return_json['previous_version'] = sentence.previous_version.pk
    else:
        return_json['previous_version'] = None
    return return_json


# NOT IMPLEMENTED
def serialize_sentence_with_replies(sentence):
    """
    Serializes sentence to JSON serializable Python data structure.
    Includes replies.
    """
    ret = serialize_sentence(sentence)
    ret['replies'] = []

    replies = Post.objects.filter(parent_content_type = ContentType.objects.get(model='sentence'), parent_id = sentence.pk)

    for reply in replies:
        ret['replies'].append({'id': reply.pk, 
                                'title': reply.title})
    return ret


def replace_query_param(url, key, val):
    """
    Taken from the framework:
    Given a URL and a key/val pair, set or replace an item in the query
    parameters of the URL, and return the new URL.
    """
    (scheme, netloc, path, query, fragment) = urlparse.urlsplit(url)
    query_dict = QueryDict(query).copy()
    query_dict[key] = val
    query = query_dict.urlencode()
    return urlparse.urlunsplit((scheme, netloc, path, query, fragment))
