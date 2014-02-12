from blog.models import User, Blog, Post, Paragraph, Sentence, Edition
from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType
from rest_framework.pagination import BasePaginationSerializer, NextPageField, PreviousPageField
import re
from django.http import QueryDict
import json
from collections import OrderedDict # For prettier json

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

  content_type = serializers.Field(source = 'content_type')

  creator = serializers.SerializerMethodField('get_creator')

  # The reason for not using this one is because the creator is not configurable
  # From the client point of view
  # The creator depends on authorization
  #creator = serializers.SlugRelatedField(slug_field = 'username')

  def get_creator(self, obj):
    return obj.creator.username

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
    fields = ('id', 'href', 'content_type', 'title', 'description', 'creator', 'created', 'is_restricted')
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
    """
	TODO: Change to more functional serializer functions instead of using Django Rest Framework...
	"""
    author = serializers.SlugRelatedField(slug_field = 'username', read_only = True)

    parent_id = serializers.IntegerField(source = 'parent_id', required = True)
    parent_content_type = serializers.CharField(max_length = 32, source='parent_content_type', required = True)
    
    parent_repr = serializers.SerializerMethodField('get_parent_repr')
    
    href = serializers.HyperlinkedIdentityField(view_name = 'post-detail')

    content_type = serializers.Field(source = 'content_type')

    #brief = serializers.Field(source = 'get_brief')
    editions = serializers.SerializerMethodField('get_editions')
    content = serializers.SerializerMethodField('get_content')

    def get_parent_repr(self, obj):
        if obj.pk is None:
            return None
        
        parent = ContentType.objects.get(model = obj.parent_content_type).get_object_for_this_type(pk = obj.parent_id)

        ct = parent.content_type()

        if ct == 'blog':
            return parent.title
        if ct == 'post':
            return parent.title
        if ct == 'paragraph':
            return 'paragraph'
        if ct == 'sentence':
            return parent.text.value
	
    def get_editions(self,obj):
        if obj.pk is None:
            # Post hasn't been instantiated yet.
            return None

        editions = Edition.objects.filter(parent = obj)
        
        return_json = []
        
        for v in editions:
            return_json.append({"id": v.pk, "created": v.created})

        return return_json

    def get_content(self, obj):
        if obj.pk is None:
            # Post hasn't been instantiated yet.
            return None

        return_json = {}
        return_json['paragraphs'] = self.get_paragraphs(obj)        

        return return_json

    def get_paragraphs(self, obj):
        if obj.pk is None:
            # Post hasn't been instantiated yet.
            return None
        edition = Edition.objects.filter(parent = obj)[0]
        paras = Paragraph.objects.filter(edition = edition).order_by('ordering')
        res = []
        for p in paras:
            res.append( serialize_paragraph(p) )
        return res

    def get_sentences(self, obj):
        # TODO?
        # When creating a post, the serializer is used for validation
        if obj.pk is None:
            # Post hasn't been instantiated yet.
            return None

        edition = Edition.objects.filter(parent = obj)[0]
        sentences = Sentence.objects.filter(edition = edition)

        res = []
        for sent in sentences:
            res.append( serialize_sentence(sent) )

        return res

    def validate_parent_content_type(self, attrs, source):
        if attrs.get('parent_content_type', None) is None:
            return attrs

        choices = ['blog', 'post', 'sentence', 'paragraph']
        if attrs['parent_content_type'] not in choices:
        #if (attrs['parent_content_type'] == u'blog') or (attrs['parent_content_type'] == u'post') or (attrs['parent_content_type'] == u'sentence'):
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
                  'parent_content_type', 'parent_id', 'parent_repr', 'editions', 'content')

        read_only_fields = ('created', 'modified',)
        
        #depth = 1


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


def serialize_blog_brief(blog):
    """
    TODO
    """
    return {
        'id': blog.id,
        'title': blog.title,
        'href': '/blog/api/blogs'
    }

def serialize_parent_field(parent_content_type, parent_id):
    """
    TODO: Deep option, calls recursive serializer
    """
    return_json = None

    parent = ContentType.objects.get(name = parent_content_type).get_object_for_this_type(pk = parent_id)

    if parent.content_type() == 'blog':
        return_json = parent.title
    if parent.content_type() == 'post':
        return_json = parent.title
    if parent.content_type() == 'paragraph':
        return_json = 'Paragraph'
    if parent.content_type() == 'sentence':
        return_json = parent.text.value

    return return_json



def serialize_post(post, deep = True):
    """
    If not deep: parent will not be fully evaluated.
    This is useful to stop recursive serialization if a post is made on a post that is made on a post

    TODO: Write a test for this
    """
    return_json = OrderedDict([('id', post.id),
                                ('title', post.title),
                                ('author', post.author.username),
                                ('created', post.created.isoformat()),
                                ('modified', post.modified.isoformat()),
                                ('content_type', post.content_type()),
                                ('parent_content_type', post.parent_content_type.name),
                                ('parent_id', post.parent_id),
                                ('is_active', post.is_active),
                                ('blog', post.blog.pk),
                                ('number_posts', post.number_posts),
                                ('editions', [])])

    if deep:
        return_json['parent_repr'] = serialize_parent_field(post.parent_content_type, post.parent_id)

    for index, edition in enumerate(post.editions.order_by('-created')):

        if (deep == True) and (index == 0):
            return_json['content'] = serialize_edition(edition)

        return_json['editions'].append(serialize_edition(edition, deep = False))

    return return_json


def serialize_edition(edition, deep = True):

    return_json = OrderedDict([('id', edition.pk), 
                               ('created', edition.created.isoformat()),
                               ('content_type', 'edition')])

    if deep: 
        return_json['paragraphs'] = []
        for p in edition.paragraphs.all():
            return_json['paragraphs'].append( serialize_paragraph(p) )

    return return_json


def serialize_paragraph(paragraph):
    return_json = OrderedDict([('id', paragraph.pk),
                               ('content_type', 'paragraph'),
                               ('ordering', paragraph.ordering),
                               ('number_sentences', paragraph.number_sentences),
                               ('number_posts', paragraph.number_posts),
                               ('sentences', [])])

    return_json['sentences'] = []

    sentences = paragraph.sentences.order_by('ordering')
    for s in sentences:
        return_json['sentences'].append( serialize_sentence(s) )

    return return_json


def serialize_sentence(sentence):
    """
    TODO: Is it clean to return just edition and post pk?
    """
    edition = sentence.edition

    return_json = {
        'post': edition.parent.pk,
        'edition': edition.pk,
        'id': sentence.pk, 
        'text': sentence.text.value, 
        'ordering': sentence.ordering,
        'mode': sentence.mode,
        'content_type': 'sentence',
        'paragraph': sentence.paragraph.ordering,
        'paragraph_pk': sentence.paragraph.pk,
        'number_replies': sentence.number_posts
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


