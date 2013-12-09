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

class ExpiringTokenAuthentication(TokenAuthentication):
    def authenticate_credentials(self, key):
        try:
            token = self.model.objects.get(key=key)
        except self.model.DoesNotExist:
            raise exceptions.AuthenticationFailed('Invalid token')

        if not token.user.is_active:
            raise exceptions.AuthenticationFailed('User inactive or deleted')

        utc_now = datetime.datetime.utcnow().replace(tzinfo=utc)

        if token.created < utc_now - datetime.timedelta(hours=24):
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
			if request.META.get('CONTENT_TYPE', None) == 'application/json':
				return Response({"user": 'TODO: Serialize User'})
			else:
				return HttpResponse("You are logged in")

		# Token session handling
		elif request.META.get('HTTP_X_AUTHORIZATION', None) is not None:
			if request.META.get('CONTENT_TYPE', None) == 'application/json':
				try:
					Token.objects.get(key = request.META['HTTP_X_AUTHORIZATION'])
					return Response({"status": True, "active_token_sessions": len(Token.objects.all())}, status = 200)
				except:
					return Response({"status": False,  "active_token_sessions": len(Token.objects.all())}, status = 404)
			else:
				return HttpResponse("You are logged in")

		# Non authenticated cookie session nor has token
		else: 
			if request.META.get('CONTENT_TYPE', None) == 'application/json':
				return Response({}, status = 404)
			else:
				return HttpResponse("You are not logged in", status = 404)

	def post(self, request):
		serializer = self.serializer_class(data=request.DATA)
		if serializer.is_valid():
			print("\033[94mToken input is Valid")
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
		if request.META.get("HTTP_X_AUTHORIZATION", None) is not None:
			try: 
				existing_token = Token.objects.get(key = request.META["HTTP_X_AUTHORIZATION"])
				existing_token.delete()
			except Token.DoesNotExist as dne:
				return Response({"status": "That session is not active"}, status = 404)
			return Response({"status": "Session has been signed off"}, status = 200)	
		else: 
			return Response({"error": "X-Authorization header not included"})



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
