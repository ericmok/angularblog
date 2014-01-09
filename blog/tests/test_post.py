"""
Some assumptions about tokens & blogs working
"""
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

class PostEndPoint(TestCase):
	fixtures = ['nice_fixture3.json']

	def setUp(self):
		self.client = Client()
		response = self.client.post(AUTH_URL, data=TEST_USER_ALICE_JSON, content_type='application/json')
		self.token = json.loads(response.content)['token']

	def test_can_make_GET_request(self):
		response = self.client.get(POSTS_URL)
		self.assertEqual(response.status_code, 200)
		self.assertIn("{", response.content)
		self.assertIn("[", response.content)

	def test_can_get_comments_on_post(self):
		response = self.client.get(POSTS_URL + "/1/comments")
		self.assertEqual(response.status_code, 200)
		self.assertIn("{", response.content)
		self.assertIn("[", response.content)		

	def test_response_to_bad_pks_in_URL(self):
		response = self.client.get(POSTS_URL + "/1a")
		self.assertEqual(response.status_code, 404)
		self.assertIn("detail", response.content)

	def test_returns_unauthorized_401_when_POST_with_no_credentials(self):
		response = self.client.post(POSTS_URL)
		self.assertEqual(response.status_code, 401)

	def test_cannot_create_post_with_null_payload(self):
		response = self.client.post(POSTS_URL, data={}, HTTP_X_AUTHORIZATION=self.token)
		self.assertEqual(response.status_code, 400)

	# TODO: The rest!


class CreatingPost(TestCase):
	fixtures = ['nice_fixture3.json']

	def setUp(self):
		self.client = Client()
		response = self.client.post(AUTH_URL, data=TEST_USER_ALICE_JSON, content_type='application/json')
		self.token = json.loads(response.content)['token']

	def test_post_serializer(self):
		from blog.rest.serializers import PostSerializer
		data = {
			"title": "Some title",
			"description": "Blah",
			"parent_content_type": "blog",
			"parent_id": 1,
			"content": "Some content here. And here is my second sentence."
		}
		post_serializer = PostSerializer(data=data)
		post_serializer.is_valid()
		self.assertIn('title', post_serializer.data)

	def test_can_post_on_paragraph(self):
		payload = {"title": "Some title",
					"description": "blah",
					"parent_content_type": "blog",
					"parent_id": 1,
					"content": "Some content here. And here is my second sentence."}
		payload = json.dumps(payload)
		response = self.client.post(POSTS_URL, payload, content_type='application/json', HTTP_X_AUTHORIZATION=self.token)

		print ("\n%s\n" % [response.content])

		self.assertEqual(response.status_code, 201)
		jsonized_content = json.loads(response.content)

		self.assertEqual(jsonized_content['number_paragraphs'], 1)
		self.assertEqual(jsonized_content['number_sentences'], 2)

