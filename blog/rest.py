
from blog.models import Sentence, Post, Blog

from django.contrib.auth.models import User, Group
from django.contrib.contenttypes.models import ContentType

from rest_framework import serializers, viewsets, routers
from rest_framework.response import Response

from rest_framework import mixins, status, reverse
from rest_framework.decorators import action, permission_classes

from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from django.core.urlresolvers import NoReverseMatch

from rest_framework.reverse import reverse

class BasicUserSerializer(serializers.HyperlinkedModelSerializer):

    href = serializers.HyperlinkedIdentityField(view_name = 'user-detail', lookup_field = 'username')

    class Meta:
        model = User
        fields = ('href', 'username', 
                  'date_joined', 'last_login')
        lookup_field = 'username'


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
                            'date_joined', 'last_login',)
        
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


    
class PostParentContentTypeField(serializers.CharField):

    def to_native(self, obj):
        """
        Converts Post object <specified as the model to use in ModelSerializer>
        and converts it to a simple primitive
        """
        return "%s" % (obj.name) 
    

    def from_native(self, value):
        """
        Converts simple primitive <string> to object <ContentType>
        This logic should really be in the serializer validation logic
        """
        print("FROM NATIVE")
        return ContentType.objects.get(name = value)

 
        
class BlogSerializer(serializers.HyperlinkedModelSerializer):

    #creator_url = serializers.HyperlinkedRelatedField(view_name = 'user-detail', lookup_field = 'username', read_only = True, source='creator')
    ##author = serializers.CharField(max_length = 64)
    #creator = serializers.SlugRelatedField(slug_field = 'username')
    href = serializers.HyperlinkedIdentityField(view_name = 'blog-detail')
    creator = BasicUserSerializer()

    class Meta:
        depth = 1
        model = Blog
        fields = ('href', 
                  'title', 'creator',
                  'created')

class BlogViewSet(viewsets.ModelViewSet): 

    queryset = Blog.objects.all()
    serializer_class = BlogSerializer


class BasicPostSerializer(serializers.HyperlinkedModelSerializer):
    href = serializers.HyperlinkedIdentityField(view_name='post-detail')
    author = BasicUserSerializer()

    class Meta:
        depth = 1
        model = Post

class PostSerializer(serializers.HyperlinkedModelSerializer):
    
    #author_url = serializers.HyperlinkedRelatedField(view_name = 'user-detail', lookup_field = 'username', read_only = True, source='author')
    ##author = serializers.CharField(max_length = 64)

    # TODO: Change this to UserSerializer
    #author = serializers.SlugRelatedField(slug_field = 'username')

    author = BasicUserSerializer()

    #ordering = serializers.CharField(max_length = 1024, source='ordering', required = False)
    parent_id = serializers.IntegerField(source = 'parent_id', required = False)
    parent_content_type = serializers.CharField(max_length = 32, source='parent_content_type', required = False)
    
    href = serializers.HyperlinkedIdentityField(view_name = 'post-detail')
    
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
        fields = ('href', 'id', 
                  'author', 
                  'created', 'modified',

                  'parent_content_type', 'parent_id')

        read_only_fields = ('created', 'modified',
                            'ordering')
        
        depth = 1

    
############
## TODO: Editing generic foreign key not working?
############
class PostViewSet(viewsets.GenericViewSet, 
                  mixins.ListModelMixin,
                  mixins.RetrieveModelMixin,
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
   

class SentenceSerializer(serializers.HyperlinkedModelSerializer):
    
    href = serializers.HyperlinkedIdentityField(view_name = 'sentence-detail')
    post = BasicPostSerializer()

    class Meta:
        depth = 1
        model = Sentence
        fields = ('href', 'created', 'text', 'ordering', 'post')
        read_only_fields = ('created', 'ordering')


class SentenceViewSet(viewsets.ModelViewSet):
    
    queryset = Sentence.objects.all()
    serializer_class = SentenceSerializer
    