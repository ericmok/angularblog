from django.shortcuts import render
import json
from django.http import HttpResponse
from session_tokens.models import SessionToken


def token_view(request):
	"""
	On a GET request:
	- Tokens are read from the 'X-Authorization' HTTP header and not via URL for security reasons.
	- Checks if a token with the same key exists.
	- If the token exists, return json representation of the token.
	- If the token is expired, return a 404. 
	- - Not sure whether last sessions are important to display.
	- If the session has expired, return a 404.

	On a POST request, authenticate the user via JSON payload. 
	- On success, delete previous tokens associated with user and create a new token.
	- If the authentication fails, then return a 40X.
	"""
	if request.method == 'GET':
		pass
	elif request.method == 'POST':
		pass
	else:
		pass


def obtain_token(request):
	pass

def delete_token(request):
	pass


class TokenAuthorization:
	"""
	Given a request, extract the X-Authorization token. Check if it has expired.
	Give permission if token is still valid.
	"""
	pass