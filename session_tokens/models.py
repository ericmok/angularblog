from django.db import models
from django.contrib.auth.models import User
import uuid
import hmac
from hashlib import sha1

class SessionToken(models.Model):
	"""
	Custom tokens authorization model. 
	"""
	key = models.CharField(max_length = 96, primary_key = True)
	user = models.OneToOneField(User, related_name='auth_token')
	created = models.DateTimeField(auto_now_add = True)


	def save(self, *args, **kwargs):
		if not self.key:
			self.key = self.generate_key()
		return super(SessionToken, self).save(*args, **kwargs)

	def generate_key(self):
		unique = uuid.uuid4()
		return hmac.new(unique.bytes, digestmod = sha1).hexdigest()

	def __unicode__(self):
		return self.key