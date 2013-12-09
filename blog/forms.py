from django import forms
import re

USERNAME_REGEX = "[^A-Za-z0-9\_\-]"

class RegisterForm(forms.Form):
	username = forms.CharField( max_length = 30 )
	password = forms.CharField( widget = forms.PasswordInput() )
	password_confirm = forms.CharField( widget = forms.PasswordInput() )


	def clean_username(self):

		if len( self.cleaned_data['username'] ) <= 3:
			raise ValidationError("Username too short!")

		invalid_tokens = re.search( USERNAME_REGEX, self.cleaned_data['username'] )

		if invalid_tokens is not None:
			raise ValidationError("Username cannot contain the '%s' character." % error )

		else:
			return self.cleaned_data['username']


	def validate(self):
		if self.cleaned_data['password'] != self.cleaned_data['password_confirm']:
			raise forms.ValidationError("Passwords do not match!")
		return self.cleaned_data['password']


