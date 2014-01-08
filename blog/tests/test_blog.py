from django.test import TestCase, Client, LiveServerTestCase
from django.test.client import RequestFactory
import selenium
from selenium import webdriver
from selenium.webdriver.common.keys import Keys
import nltk
import json
from django.contrib.auth.models import User
from blog.rest.sessions import *
from blog.models import *

import pdb

ROOT_URL = 'http://localhost:8000/blog'

AUTH_URL = ROOT_URL + '/api-tokens'

SIGNIN_URL_FRAG = '/blog/sign-in'
SIGNIN_URL = ROOT_URL + '/sign-in'
USERS_URL = ROOT_URL + '/api/users'
BLOGS_URL = ROOT_URL + '/api/blogs'
POSTS_URL = ROOT_URL + '/api/posts'
SENTENCES_URL = ROOT_URL + '/api/sentences'

TEST_USER_ALICE = {
	"username": "alice",
	"password": "testtest"
}

TEST_USER_BOBBY = {
	"username": "bobby",
	"password": "testtest"
}

TEST_USER_ALICE_JSON = json.dumps(TEST_USER_ALICE)
TEST_USER_BOBBY_JSON = json.dumps(TEST_USER_BOBBY)

class BlogGetEndpoint(TestCase):
	fixtures = ['nice_fixture3.json']

	def setUp(self):
		self.client = Client()


	def test_can_make_ajax_call_to_blogs(self):
		response = self.client.get(BLOGS_URL, HTTP_ACCEPT='text/html')
		self.assertEqual(response.status_code, 200)
		self.assertIn("eri5", response.content)


	def test_can_get_html_or_json(self):
		response = self.client.get(BLOGS_URL, HTTP_ACCEPT='text/html')
		self.assertEqual(response.status_code, 200)
		self.assertIn("eri5", response.content)

		response = self.client.get(BLOGS_URL, HTTP_ACCEPT='application/json')
		self.assertEqual(response.status_code, 200)
		self.assertIn("{", response.content)		


	def test_can_find_blog_in_nice_fixture_if_pk_is_a_number(self):
		response = self.client.get(BLOGS_URL + "/3", HTTP_ACCEPT='application/json')
		self.assertEqual(response.status_code, 200)
		self.assertIn("{", response.content)

	def test_can_find_blog_in_nice_fixture_if_pk_is_the_title_name_equality_issues(self):
		response = self.client.get(BLOGS_URL + "/equality_issues")
		self.assertEqual(response.status_code, 200)
		self.assertIn("Equality", response.content)

	def test_returns_404_on_not_found(self):
		response = self.client.get(BLOGS_URL + "/304_")
		self.assertEqual(response.status_code, 404)

	def test_returns_collection_based_response(self):
		response = self.client.get(BLOGS_URL)
		self.assertIn("[", response.content)

class BlogPostEndpoint(TestCase):
	fixtures = ['nice_fixture3.json']

	def setUp(self):
		self.client = Client()

	def test_can_recognize_credentials_in_POST_request(self):
		"""
		Assumes that tokens work

		TODO: For some reason, this works only if content_type arg is lower case
		"""
		response = self.client.post(AUTH_URL, data=TEST_USER_ALICE_JSON, content_type='application/json')

		token = json.loads(response.content)['token']


		payload = json.dumps({"title": "My Blog"})
		blog_creation_response = self.client.post(BLOGS_URL, data=payload, 
													content_type='application/json',
													HTTP_X_AUTHORIZATION=token)
		self.assertNotEqual(blog_creation_response.status_code, 403)

	