from blog.models import User, Blog, Post, Sentence
from rest_framework import serializers

class BasicUserSerializer(serializers.ModelSerializer):
    href = serializers.HyperlinkedIdentityField(view_name = 'user-detail', lookup_field = 'username')

    class Meta:
        model = User
        fields = ('id', 'href', 'username', 'date_joined')
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

  class Meta:
    model = Blog
    fields = ('id', 'href', 'title', 'creator')





class PostSerializer(serializers.HyperlinkedModelSerializer):
    
    author = serializers.SlugRelatedField(slug_field = 'username')

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
