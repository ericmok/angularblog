import uuid
import hmac
from hashlib import sha256 # CHANGED
from rest_framework.compat import AUTH_USER_MODEL
from django.conf import settings
from django.db import models


class Token(models.Model):
    """
    The default authorization token model.
    """
    key = models.CharField(max_length=40, primary_key=True)
    user = models.OneToOneField(AUTH_USER_MODEL, related_name='auth_token')
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Work around for a bug in Django:
        # https://code.djangoproject.com/ticket/19422
        #
        # Also see corresponding ticket:
        # https://github.com/tomchristie/django-rest-framework/issues/705
        abstract = 'rest_framework.authtoken' not in settings.INSTALLED_APPS

    def save(self, *args, **kwargs):
        if not self.key:
            self.key = self.generate_key()
        return super(Token, self).save(*args, **kwargs)

    def generate_key(self):
        #unique = str( uuid.uuid4() ) + str( uuid.uuid4() ) #CHANGED
        #return hmac.new(unique, digestmod=sha256).hexdigest() #CHANGED, 
        return str( sha256( str(uuid.uuid4()) ).hexdigest() ) + str( sha256( str(uuid.uuid4()) ).hexdigest() )

    def __unicode__(self):
        return self.key
