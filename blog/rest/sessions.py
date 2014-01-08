"""
An API Endpoint for managing sessions
"""

from rest_framework import viewsets
from rest_framework.authtoken.serializers import AuthTokenSerializer
import datetime
from django.utils.timezone import utc
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.authentication import TokenAuthentication
from rest_framework import exceptions, status
import json
from django.http import HttpResponse
from django.core.exceptions import ObjectDoesNotExist
import re # For content_type checking



def get_authorization_header(request):
    """
    Taken from rest_framework

    Return request's 'Authorization:' header, as a bytestring.

    Hide some test client ickyness where the header can be unicode.
    """
    auth = request.META.get('HTTP_X_AUTHORIZATION', 
    		request.META.get('HTTP_AUTHORIZATION', None))
    
    if auth is None:
    	return None

    if type(auth) == type(''):
        # Work around django test client oddness
        auth = auth.encode('iso-8859-1')
    return auth

def content_type_is_json(request):
	content_type = request.META.get('CONTENT-TYPE', 
			request.META.get('CONTENT_TYPE',
			request.META.get('content-type',
			request.META.get('Content-Type',
			request.META.get('Content-type', None) ) ) ) )
	if content_type is None:
		return False

	if re.search('application/json', content_type) is not None:
		return True
	else:
		return False

def client_accepts_json(request):
	# Since we use regex to parse accept, get empty string rather than None
	#print("META")
	#print(request.META)
	accept = request.META.get('HTTP_ACCEPT', '')
	if re.search('json', accept) is not None:
		return True
	else:
		return content_type_is_json(request) 


def get_token_from_auth_header(request):
	token = get_authorization_header(request)

	if token is not None:
		# Token def0abc6d0efa60...
		# Make it lenient. If only the token key is presented, just take that as the key
		words = token.split()
		if ( len(words) < 2 ) and ( len(words) > 0 ):
			token = words[0]
		elif len(words) == 2:
			token = words[1]
		else: 
			token = None
		return token
	else:
		return None



class ExpiringTokenAuthentication(TokenAuthentication):
    def authenticate(self, request):    	
        token = get_token_from_auth_header(request)

        if token is None:
            #msg = 'Token header missing. No credentials provided.'
            #raise exceptions.AuthenticationFailed(msg)
            return None

        return self.authenticate_credentials(token)

    def authenticate_credentials(self, key):
        try:
            token = self.model.objects.get(key=key)
        except self.model.DoesNotExist:
            raise exceptions.AuthenticationFailed('Invalid token')

        if not token.user.is_active:
            raise exceptions.AuthenticationFailed('User inactive or deleted')

        utc_now = datetime.datetime.utcnow().replace(tzinfo=utc)

        if token.created < utc_now - datetime.timedelta(hours=24):
        	# TODO: Should I delete the token to clean it up?
            raise exceptions.AuthenticationFailed('Token has expired')

        return (token.user, token)


class ObtainExpiringAuthToken(ObtainAuthToken):
	
	def get(self, request):
		"""
		TODO: It may not be RESTful to send a GET request to a URL and change
		what representation is being asked for in the headers!!!
		"""
		# Cookie session handling
		if request.user.is_authenticated():
			if client_accepts_json(request):
				return Response({"user": 'TODO: Serialize User'})
			else:
				return HttpResponse("You are logged in")

		# Token session handling
		# It has basic content-negotiation functionality...
		elif get_authorization_header(request) is not None:			
			try:
				Token.objects.get(key = get_token_from_auth_header(request))
				if client_accepts_json(request):
					return Response({"status": True, "active_token_sessions": len(Token.objects.all())}, status = 200)
				else: 
					return HttpResponse("You are logged in")
			except:
				if client_accepts_json(request):
					return Response({"status": False,  "active_token_sessions": len(Token.objects.all())}, status = 404)
				else:
					return HttpResponse("You are not logged in", status = 404)

		# Non authenticated cookie session nor has token
		else: 
			if client_accepts_json(request):
				return Response({"status": False, "active_token_sessions": len(Token.objects.all())}, status = 404)
			else:
				return HttpResponse("You are not logged in", status = 404)

	def post(self, request):
		serializer = self.serializer_class(data=request.DATA)
		if serializer.is_valid():
			#print("\033[94mToken input is Valid")
			try: 
				existing_token = Token.objects.get(user = serializer.object['user'])
				existing_token.delete()
				#existing_token.created = datetime.datetime.utcnow().replace(tzinfo=utc)
				#existing_token.key = existing_token.generate_key()
				#existing_token.save()
				#token = existing_token
			except Token.DoesNotExist as dne:
				pass 
			finally:
				new_token = Token.objects.create(user = serializer.object['user'])

			#token, created = Token.objects.get_or_create(user=serializer.object['user'])
			# update the created time of the token to keep it valid
			#token.created = datetime.datetime.utcnow().replace(tzinfo=utc)
			#token.key = token.generate_key()
			#token.save()
			return Response({'token': new_token.key})
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

	def delete(self, request):
		"""
		Delete tokens to log out. Should pass in the token, not the user/pass combo.
		"""
		if get_authorization_header(request) is not None:
			try: 
				existing_token = Token.objects.get(key = get_token_from_auth_header(request))
				existing_token.delete()
			except Token.DoesNotExist as dne:
				return Response({"status": "That session is not active", "active_token_sessions": len(Token.objects.all())}, status = 404)
			return Response({"status": "Session has been signed off", "active_token_sessions": len(Token.objects.all())}, status = 200)	
		else: 
			return Response({"error": "X-Authorization header not included", "active_token_sessions": len(Token.objects.all())})



obtain_auth_token = ObtainExpiringAuthToken.as_view()


class SessionViewSet(viewsets.ViewSet):

	def create(self, request):
		pass

	def list(self, request):
		pass

	def retrieve(self, request, pk = None):
		pass

	def update(self, request, pk = None):
		pass

	def delete(self, request, pk = None):
		pass
