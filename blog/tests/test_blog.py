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

import warnings
import pdb

from config import *

class BlogHelprFunctions(TestCase):
	fixtures = ['nice_fixture3.json']

	def test_can_fetch_slug_or_pk_otherwise_404(self):
		from blog.rest.viewsets.blog_viewset import fetch_slug_or_pk_otherwise_404
		self.assertTrue(fetch_slug_or_pk_otherwise_404(1) == Blog.objects.get(pk = 1))

		try: 
			blog = fetch_slug_or_pk_otherwise_404('1')
		except:
			self.assertIsNone(blog)


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


class BlogCreationTests(TestCase):
	fixtures = ['nice_fixture3.json']

	def setUp(self):
		self.client = Client()
		response = self.client.post(AUTH_URL, data=TEST_USER_ALICE_JSON, content_type='application/json')
		self.token = json.loads(response.content)['token']	

	def test_can_create_blog_with_title_description(self):
		"""
		Test if given only a title and description payload, we can create blog
		"""
		# Non JSON payload
		payload = {"title": "A super original blog", "description": "Some description"}
		response = self.client.post(BLOGS_URL, data=payload, 
										HTTP_X_AUTHORIZATION=self.token)
		self.assertEqual(response.status_code, 201)

	def test_can_create_blog_with_title_description_is_restricted(self):
		payload = {"title": "A brand new blog", "description": "Some desc", "is_restricted": True}			

		response = self.client.post(BLOGS_URL, data=payload, HTTP_X_AUTHORIZATION=self.token)
		self.assertEqual(response.status_code, 201)

	def test_cannot_create_blog_with_punctuation(self):
		payload = {"title": "This is it!", "description": "Some desc", "is_restricted": True}

		response = self.client.post(BLOGS_URL, data=payload, HTTP_X_AUTHORIZATION=self.token)
		self.assertEqual(response.status_code, 400)

	def test_refuses_to_make_duplicate_blog_title_creator_with_POST_request(self):		
		payload = {"title": "A brand new blog", "description": "Some desc", "is_restricted": True}			

		response = self.client.post(BLOGS_URL, data=payload, HTTP_X_AUTHORIZATION=self.token)
		self.assertEqual(response.status_code, 201)

		payload = {"title": "A brand new blog", "description": "Some desc", "is_restricted": True}			

		response = self.client.post(BLOGS_URL, data=payload, HTTP_X_AUTHORIZATION=self.token)
		warnings.warn("\nDuplicate Blog Test: The response should be 409 but serializer validation takes over")
		self.assertEqual(response.status_code, 400)

	def test_refuses_to_make_duplicate_blog_title_author_case_insensitive_with_POST_request(self):		
		payload = {"title": "A brand new BLOG", "description": "Some desc", "is_restricted": True}			

		response = self.client.post(BLOGS_URL, data=payload, HTTP_X_AUTHORIZATION=self.token)
		self.assertEqual(response.status_code, 201)

		payload = {"title": "A brand new bloG", "description": "Some desc", "is_restricted": True}			

		response = self.client.post(BLOGS_URL, data=payload, HTTP_X_AUTHORIZATION=self.token)
		self.assertNotEqual(response.status_code, 200)
		self.assertNotEqual(response.status_code, 201)
		self.assertNotEqual(response.status_code, 304)

	def test_can_get_posts_made_on_a_blog_with_pk_or_slug_lookup(self):
		response = self.client.get(BLOGS_URL + '/1/comments')
		self.assertEqual(response.status_code, 200)
		self.assertTrue(len(json.loads(response.content)['results']) > 0)

		response = self.client.get(BLOGS_URL + '/law/comments')
		self.assertEqual(response.status_code, 200)
		self.assertTrue(len(json.loads(response.content)['results']) > 0)

	def test_can_update_description_of_blog(self):
		# Caveat: cannot take application/octet-stream
		payload = {
			'description': 'Changed'
		}
		payload = json.dumps(payload)
		response = self.client.patch(BLOGS_URL + '/1', content_type = 'application/json', data = payload, HTTP_X_AUTHORIZATION=self.token)
		
		self.assertEqual(response.status_code, 200)
		self.assertIn('description', response.content)
		self.assertIn('Changed', response.content)

		response = self.client.post(AUTH_URL, data = TEST_USER_BOBBY_JSON, content_type='application/json')
		bobby_token = json.loads(response.content)['token']	

		response = self.client.patch(BLOGS_URL + '/1', content_type = 'application/json', data = payload, HTTP_X_AUTHORIZATION = bobby_token)
		self.assertEqual(response.status_code, 401)

	def test_cannot_update_title_of_blog(self):
		payload = {
			'title': 'Do not change',
			'description': 'Changed'
		}
		payload = json.dumps(payload)
		response = self.client.patch(BLOGS_URL + '/1', content_type = 'application/json', data = payload, HTTP_X_AUTHORIZATION = self.token)
		
		self.assertEqual(response.status_code, 200)
		self.assertNotIn('Do not change', response.content)


class BlogEndpoint(TestCase):
	fixtures = ['nice_fixture3.json']

	def setUp(self):
		self.client = Client()
		response = self.client.post(AUTH_URL, data=TEST_USER_ALICE_JSON, content_type='application/json')
		self.token = json.loads(response.content)['token']	

	def test_can_get_creator_field_of_blog(self):
		response = self.client.get(BLOGS_URL + '/1')
		self.assertIn('creator', response.content)