from django.test import TestCase
import selenium
import nltk
from django.test import Client
import json
from django.contrib.auth.models import User

# Create your tests here.
class FirstTest(TestCase):
	def test_testing(self):
		self.assertEqual(True, True)

BLOGS_URL = '/blog/api/blogs'
POSTS_URL = '/blog/api/posts'
TOKENS_URL = '/blog/api-tokens'
SIGNIN_URL = '/blog/sign-in'

#test_user = User.objects.create(username="tester", password="tester")
#test_user.set_password("tester")

class Tokens(TestCase):
	fixtures = ['fixture.json']

	def test_can_get_token(self):
		client = Client()

		credentials = {"username": "eric", "password": "wt25yq186vke1dcd"} 
		response = client.post(TOKENS_URL, data = credentials)
		print("Response: %s" % response.content)
		self.assertEqual( response.status_code, 200 )


class Login(TestCase):
	def test_can_obtain_cookie_sesion(self):	
		client = Client()
		User.objects.create_user(username = 'tester', password = 'tester')
		#client.post(SIGNIN_URL, {'username': 'eric', 'password': 'wt25yq186vke1dcd'})
		status = client.login(username='tester', password='tester')
		self.assertTrue(status)


class BlogViewGetTest(TestCase):
	fixtures = ['fixture.json']

	def test_get_request(self):
		client = Client()
		response = client.get(BLOGS_URL, HTTP_X_REQUESTED_WITH = 'XMLHttpRequest', CONTENT_TYPE = 'application/json', ACCEPT = 'application/json')
		self.assertEqual( response.status_code, 200 )

	def test_testing_for_querysets(self):
		from blog.models import Blog
		result = len( Blog.objects.all() )
		print("result" + str(result) )
		self.assertIsNot( Blog.objects.all(), None )
		self.assertTrue( result > 0 )




class PostViewGetTest(TestCase):
	fixtures = ['fixture.json']

	def test_can_get_ajax(self):
		client = Client()
		response = client.get('/blog/api/posts', HTTP_X_REQUESTED_WITH = 'XMLHttpRequest', ACCEPT = "application/json", CONTENT_TYPE = "application/json")
		#print(response.content)
		self.assertEqual( response.status_code, 200 )

	def test_can_post_ajax(self):
		client = Client()
		response = client.post('/blog/api/posts/', data = {}, HTTP_X_REQUESTED_WITH = 'XMLHttpRequest', ACCEPT = "application/json", CONTENT_TYPE = "application/json")
		#print(response.content)
		self.assertEqual( response.status_code, 404 ) # Unfortunately this is an expectation

class ParserTest(TestCase):
	fixtures = ['fixture.json']

	def test_can_load_pickle(self):
		"""
		This tests NLTK works or not
		"""
		import parser
		result = parser.parse_content("This is a test Dr. Jason. Where is Mrs. Alice?")
		print("\n%s\n" % result)
		self.assertIsNotNone(result)
		self.assertTrue( isinstance(result, list) )
		self.assertTrue( len(result), 2 )