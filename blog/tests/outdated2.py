"""
posts_view refers to the following:

/blogs/1/posts
/posts/1/posts
/sentences/1/posts
"""

from django.test import TestCase
import selenium
import nltk
from django.test import Client
import json
from django.contrib.auth.models import User

from blog.models import *

import pdb

ROOT_URL = 'http://localhost:8000/blog'
BLOGS_URL = ROOT_URL + '/api/blogs'
POSTS_URL = ROOT_URL + '/api/posts'
SENTENCES_URL = ROOT_URL + '/api/sentences'

class TestPostView(TestCase):
	fixtures = ['nice_fixture.json']
	
	def test_works(self):
		self.assertTrue(True)

	def test_post_view_can_return_collection_object(self):

		def assertions(response): 
			json_response = json.loads(response.content)

			self.assertTrue(response.status_code == 200)
			self.assertTrue( json_response['collection'] is not None )
			self.assertTrue( json_response['collection']['items'] is not None )
			

		client = Client()
		response = client.get(BLOGS_URL + "/1/posts", HTTP_ACCECPT = 'application/json')
		assertions(response)
		self.assertTrue(  len( json.loads(response.content)['collection']['items'] ) > 0  )
		response = client.get(POSTS_URL + "/1/posts", HTTP_ACCECPT = 'application/json')
		assertions(response)
		self.assertTrue(  len( json.loads(response.content)['collection']['items'] ) == 0  )
		response = client.get(SENTENCES_URL + "/1/posts", HTTP_ACCECPT = 'application/json')
		assertions(response)
		self.assertTrue(  len( json.loads(response.content)['collection']['items'] ) == 0  )


	def test_post_view_can_handle_low_pagination_error(self):
		client = Client()
		response = client.get(BLOGS_URL + "/1/posts?page=0")
		self.assertEqual(response.status_code, 404)

		json_response = json.loads(response.content)
		self.assertTrue( json_response['detail'] is not None )

	def test_post_view_can_handle_high_pagination_error(self):
		client = Client()
		response = client.get(BLOGS_URL + "/1/posts?page=100")
		self.assertEqual(response.status_code, 404)

		json_response = json.loads(response.content)
		self.assertTrue( json_response['detail'] is not None )

	def test_post_view_can_handle_invalid_characters_in_pagination(self):
		client = Client()
		response = client.get(BLOGS_URL + "/1/posts?page=1asdf@#^")

		json_response = json.loads(response.content)
		self.assertEqual(response.status_code, 404)
		self.assertTrue( json_response['detail'] is not None )

	def test_post_view_can_handle_next_link(self):
		"""
		Should display next link if the query set is huge
		"""
		for a in range(0,30):
			Post.objects.create(title = "blah", author = User.objects.get(pk=1), 
								parent_content_type = ContentType.objects.get(model='blog'), parent_id = 1)

		client = Client()
		response = client.get(BLOGS_URL + "/1/posts")

		json_response = json.loads(response.content)
		self.assertEqual(response.status_code, 200)
		self.assertTrue( json_response['collection']['links'] is not None )
		self.assertTrue( json_response['collection']['links'][0]['rel'] == 'next')

	def test_will_not_show_next_link(self):
		for a in range(0,2):
			Post.objects.create(title = "blah", author = User.objects.get(pk=1), 
								parent_content_type = ContentType.objects.get(model='blog'), parent_id = 1)

		client = Client()
		response = client.get(BLOGS_URL + "/1/posts")

		json_response = json.loads(response.content)
		self.assertEqual(response.status_code, 200)
		self.assertTrue( json_response['collection']['links'] is not None )
		self.assertTrue( len(json_response['collection']['links']) < 1 )

	def test_will_show_prev_link(self):
		for a in range(0,34):
			Post.objects.create(title = "blah", author = User.objects.get(pk=1), 
								parent_content_type = ContentType.objects.get(model='blog'), parent_id = 1)

		client = Client()
		response = client.get(BLOGS_URL + "/1/posts?page=2")

		json_response = json.loads(response.content)
		self.assertEqual(response.status_code, 200)
		self.assertTrue( json_response['collection']['links'] is not None )
		self.assertEqual( len(json_response['collection']['links']), 2 )
		self.assertTrue( json_response['collection']['links'][0]['rel'] == 'next' )
		self.assertTrue( json_response['collection']['links'][1]['rel'] == 'prev' )