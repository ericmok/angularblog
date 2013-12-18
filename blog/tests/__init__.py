from django.test import TestCase
import selenium
import nltk
from django.test import Client
import json
from django.contrib.auth.models import User

from blog.models import *

import pdb

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

		credentials = json.dumps({"username": "eric", "password": "wt25yq186vke1dcd"})
		response = client.post(TOKENS_URL, data = credentials, content_type = 'application/json')
		#print("Response: %s" % response.content)
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

	def test_user_exists(self):
		self.assertTrue( User.objects.all().__len__() > 0 )

	def test_get_request(self):
		client = Client()
		response = client.get(BLOGS_URL, HTTP_X_REQUESTED_WITH = 'XMLHttpRequest', CONTENT_TYPE = 'application/json', ACCEPT = 'application/json')
		self.assertEqual( response.status_code, 200 )

	def test_testing_for_querysets(self):
		from blog.models import Blog
		result = len( Blog.objects.all() )
		#print("result" + str(result) )
		self.assertIsNot( Blog.objects.all(), None )
		self.assertTrue( result > 0 )

	def test_cannot_make_new_blog_without_credentials(self):
		client = Client()
		response = client.post(BLOGS_URL, {"title": "Django Blog"}, HTTP_X_REQUESTED_WITH = 'XMLHttpRequest', CONTENT_TYPE = 'application/json',  ACCEPT = 'application/json')
		#print("Test can make blog: %s" % (response))
		self.assertEqual( response.status_code, 401 )

	def test_can_make_new_blog_with_credentials(self):
		client = Client()
		credentials = json.dumps({"username": "eric", "password": "wt25yq186vke1dcd"})
		response = client.post(TOKENS_URL, credentials, HTTP_X_REQUESTED_WITH = 'XMLHttpRequest', content_type = 'application/json',  ACCEPT = 'application/json')
	
		#print("test_can_make_new_blog_with_credentials %s" % (response.content))

		#self.assertTrue(  json.loads(response.content).token is not None )
		try:
			self.assertIsNotNone(json.loads(response.content)['token'])
			token = json.loads(response.content)['token']
		except:
			pdb.set_trace()

		client = Client()
		payload = json.dumps({"title": "Django Blog"})
		response = client.post(BLOGS_URL, data = payload, \
								HTTP_X_REQUESTED_WITH = 'XMLHttpRequest', \
								content_type = 'application/json', \
								HTTP_X_AUTHORIZATION = "Token " + str(token), HTTP_ACCEPT = "application/json")
		#print("Test can make blog: %s" % (response))
		try:
			self.assertEqual( response.status_code, 201 )
		except:
			print("test_can_make_new_blog_with_credentials")
			print("Auth: %s" % ("Token " + str(token)))
			print("Received Response %s" % (response.status_code))
			pdb.set_trace()

class PostViewGetTest(TestCase):
	fixtures = ['fixture.json']

	def setUp(self):
		Blog.objects.create(title = "title", creator = User.objects.all()[0])

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

	def test_can_make_post(self):
		client = Client()
		credentials = json.dumps({"username": "eric", "password": "wt25yq186vke1dcd"})
		response = client.post(TOKENS_URL, credentials, HTTP_X_REQUESTED_WITH = 'XMLHttpRequest', content_type = 'application/json',  ACCEPT = 'application/json')
		token = json.loads( response.content )['token']

		snapshot = Post.objects.all().__len__()

		payload = json.dumps( {"title": "My post", "author": 1, "parent_id": 1, "parent_content_type": "blog"} )
		response = client.post(POSTS_URL, data = payload, content_type = 'application/json', HTTP_X_AUTHORIZATION = "Token " + str(token), HTTP_ACCEPT = 'application/json')

		try:
			self.assertEqual(response.status_code, 201)
			self.assertTrue(Post.objects.all().__len__() > snapshot)
		except:
			print("test_can_make_post")
			pdb.set_trace()

class ParserTest(TestCase):
	fixtures = ['fixture.json']

	def test_can_load_pickle(self):
		"""
		This tests NLTK works or not
		"""
		import parser
		result = parser.parse_content("This is a test Dr. Jason. Where is Mrs. Alice?")
		#print("\n%s\n" % result)
		self.assertIsNotNone(result)
		self.assertTrue( isinstance(result, list) )
		self.assertTrue( len(result), 2 )


