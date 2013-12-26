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

class WhiteList(models.Model):
    """
    A white list filters users for access to a blog.
    TODO:
    """
    user = models.ForeignKey(User)
    blog = models.ForeignKey('Blog', related_name = "whitelist")

class Blog(models.Model):
    """
    Top Parent for Posts
    """
    created = models.DateTimeField(auto_now_add = True)
    
    title = models.TextField()    
    creator = models.ForeignKey(User)

    description = models.CharField(max_length = 512, null = True, blank = True)

    # Associated functionality Not implemented
    # Only specific users in the white list can contribute to a blog
    is_restricted = models.BooleanField(default = False)

    number_children = models.IntegerField(default = 0)

    class Meta:
        unique_together = ('title',)

    def content_type(self):
        return "blog"

    def get_whitelisted(self):
        return WhiteList.objects.filter(blog = self).values('user')

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
    
    # Posts can be deleted
    is_active = models.NullBooleanField(null = True, blank = True, default = True)

    # TODO: 
    blog = models.ForeignKey('Blog')

    number_children = models.IntegerField(default = 0)
    
    class Meta:
        ordering = ['-created']

    def get_brief(self):
        """
        For convenience, get a brief section of the blog. 
        Maybe should take more popular sentences...
        """
        ss = SentenceSet.objects.filter(parent = self).order_by('-created')
        if len(ss) > 0:
            sen = Sentence.objects.filter(sentence_set = ss[0]).order_by('ordering')[:3]
            if len(sen) > 0:
                ret = []
                for s in sen:
                    ret.append(s.text.value)
                ret = ''.join(ret)
                return ret
        return None

    def content_type(self):
        return "post"

class SentenceSet(models.Model):
    """
    An addressing mechanism for storing versions of a post as it is edited throughout
    its life.
    """
    parent = models.ForeignKey('Post')
    created = models.DateTimeField(auto_now_add = True)

    def content_type(self):
        return "sentenceset"

    class Meta:
        ordering = ["-created"]

class Sentence(models.Model):
    """
    A binary relation between a Sentenceset and Text.
    Text can belong to multiple posts yet, in each post,
    each Text might be commented in context of the post.
    You can comment on a Sentence (text given a context) but not the text itself
    which could be wrapped by a proposition.

    Creation date is taken from SentenceSet as sentences are created in batch

    previous_version points to a version of the sentence for which this sentence
    was derived from as a result of an editorial change.
    """
    previous_version = models.ForeignKey('Sentence', null = True, blank = True, related_name = 'new_version')
    
    # A binary relation
    # Pointer to parent of a set of sentences
    sentence_set = models.ForeignKey('SentenceSet', related_name = 'sentences')
    # And pointer to text
    text = models.ForeignKey('Text')

    # The order in which this sentence appears in the sentence set
    ordering = models.FloatField()

    # Intra-post sectioning and ordering via the paragraph mechanism
    # Can create a paragraph of texts / code / etc.
    paragraph = models.IntegerField()

    # Modifier for use cases of the sentence
    # Could be 'h' for header, 'c' for code, 't' for text, for example
    mode = models.CharField(max_length = 4, default = 't')

    # To save queries
    number_children = models.IntegerField(default = 0)

    class Meta:
        ordering = ['ordering']
        unique_together = ('sentence_set', 'text', 'ordering')

    def content_type(self):
        return "sentence"

class Text(models.Model):
    """
    Contains the string values input by the user. 
    Text may be classified based on similarity? (wordnet?, previous_versions?)
    """
    created = models.DateTimeField(auto_now_add = True)
    classifier = models.CharField(max_length = 512, null = True, blank = True)
    value = models.TextField()

    def content_type(self):
        return "text"

    class Meta:
        unique_together = ('value',)
