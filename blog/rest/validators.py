"""
TODO: Refactor viewsets by putting validation logic here...
"""
from django import forms
from blog.models import *

class PostCreate(forms.Form):
	title = forms.CharField(max_length = 256)
	content = forms.CharField(max_length = 100000)

	parent_content_type = forms.IntegerField()
	parent_id = forms.IntegerField()

	def clean_parent_content_type(self):
		data = self.cleaned_data['parent_content_type']
		try:
			ct = ContentType.objects.get(name = data)
		except ContentType.DoesNotExist:
			raise ValidationError('')
