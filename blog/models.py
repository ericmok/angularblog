from django.db import models
from django.contrib.auth.models import User

from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes import generic

from django.dispatch import receiver # For User post save hook
from django.db.models.signals import post_save

from rest_framework.authtoken.models import Token

# Make tokens when saving a user
#@receiver(post_save, sender = User)
#def create_auth_token(sender, instance = None, created = False, **kwargs):
#    if created:
#        Token.objects.create(user = instance)


# Sentence indices: 
# 1 
# 2
# 3
# 3.00000000001 <- This is an edit
# 4 <- Insertions are indistinguishable. So we add a random NONCE 
# 5
# 
# On insertion: Ordering is "1.0000000000" as default, ie.

# PHILOSOPHY >
#
# Meanings in Life
#
# by Chris
#
# Blah is a sentence. It has no meaning.
# That is it. The end!

class Blog(models.Model):
    """
    Top Parent for Posts
    """
    created = models.DateTimeField(auto_now_add = True)
    
    title = models.TextField()    
    creator = models.ForeignKey(User)

    class Meta:
        unique_together = ('title', 'creator')

    def content_type(self):
        return "blog"

class Post(models.Model):
    """
    Recursive model that contains a collection of sentences.
     
    Each sentence can have a post! So the post has a sentence as a parent. 
    Posts themselves might have posts! 
    However each post only has ONE parent.
    
    To avoid generic foreign keys...create a separate table for each 'link' post can have to another table.
    
    In addition. posts are ordered.
    """
    # Write fields
    title = models.CharField(max_length = 1024)
    author = models.ForeignKey(User)    
    
    # Read fields
    created = models.DateTimeField(auto_now_add = True)
    modified = models.DateTimeField(auto_now = True)
    
    # Dynamic fields
    parent_content_type = models.ForeignKey(ContentType, null = True, blank = True)
    parent_id = models.PositiveIntegerField(null = True, blank = True)
    parent_object = generic.GenericForeignKey('parent_content_type', 'parent_id')    
     
    def content_type(self):
        return "post"


class Sentence(models.Model):
    """
    post: Owner of the sentence
    """
    created = models.DateTimeField(auto_now_add = True)
    
    post = models.ForeignKey(Post, related_name = 'sentences')
    text = models.TextField()
    
    ordering = models.FloatField()

    class Meta:
        ordering = ['ordering']
        unique_together = ('post', 'ordering')

    def content_type(self):
        return "sentence"