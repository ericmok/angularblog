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

class PostViewsetUtils(TestCase):
	fixtures = ['nice_fixture3.json']

	def test_validate_content_has_sentences(self):
		from blog.rest.viewsets.post_viewset import content_is_not_empty
		self.assertEqual( content_is_not_empty(None), False )
		self.assertEqual( content_is_not_empty(""), False )
		self.assertEqual( content_is_not_empty(" "), False )
		self.assertEqual( content_is_not_empty('2364'), False )
		self.assertEqual( content_is_not_empty('asdf'), False )
		self.assertEqual( content_is_not_empty('asdf.'), True )

	def test_get_parent_blog_of_model(self):
		from blog.rest.viewsets.post_viewset import get_parent_blog_of_model
		self.assertTrue(get_parent_blog_of_model('blog', 1).is_restricted)
		self.assertTrue(get_parent_blog_of_model('post', 1).is_restricted)
		self.assertTrue(get_parent_blog_of_model('sentence', 1).is_restricted)
		self.assertFalse(get_parent_blog_of_model('blog', 2).is_restricted)


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

	def test_create_post_with_only_or_none_title_payload(self):
		payload = {
			"title": "Blah"
		}
		response = self.client.post(POSTS_URL, data=payload, HTTP_X_AUTHORIZATION=self.token)
		self.assertEqual(response.status_code, 400)
		self.assertIn("This field is required.", response.content)

		payload = {
			"parent_content_type": "post",
			"parent_id": 1,
			"content": "Yea this is some sentence"
		}

		response = self.client.post(POSTS_URL, data=payload, HTTP_X_AUTHORIZATION=self.token)
		self.assertEqual(response.status_code, 400)
		self.assertIn("title", response.content)

	def test_cannot_create_post_with_bad_content_type_payload(self):
		payload = {
			"title": "Look at this",
			"parent_content_type": "asdf",
			"parent_id": 1,
			"content": "This is one sentence. This is another."
		}
		response = self.client.post(POSTS_URL, data=payload, HTTP_X_AUTHORIZATION=self.token)
		self.assertEqual(response.status_code, 400)
		self.assertIn("parent_content_type", response.content)

	def test_cannot_create_post_with_bad_parent_id_payload(self):
		payload = {
			"title": "Look at this",
			"parent_content_type": "blog",
			"parent_id": "a",
			"content": "This is one sentence. This is another."
		}
		response = self.client.post(POSTS_URL, data=payload, HTTP_X_AUTHORIZATION=self.token)
		self.assertEqual(response.status_code, 400)
		warnings.warn("parent id tests are inconsistent")
		self.assertIn("parent_id", response.content)

		payload = {
			"title": "Look at this",
			"parent_content_type": "blog",
			"parent_id": 2523462432,
			"content": "This is one sentence. This is another."
		}
		response = self.client.post(POSTS_URL, data=payload, HTTP_X_AUTHORIZATION=self.token)
		self.assertEqual(response.status_code, 400)
		self.assertIn("parent id", response.content)
	
	def test_user_can_create_post_with_blog_parent_on_good_payload_and_credentials(self):
		payload = {
			"title": "Look at this",
			"parent_content_type": "blog",
			"parent_id": 1,
			"content": "This is one sentence. This is another."
		}
		response = self.client.post(POSTS_URL, data=payload, HTTP_X_AUTHORIZATION=self.token)
		self.assertEqual(response.status_code, 201)
		self.assertEqual( json.loads(response.content)['number_sentences'], 2 )

	def test_cannot_create_post_without_sentence_content_in_the_payload(self):
		payload = {
			"title": "Look at this",
			"parent_content_type": "blog",
			"parent_id": 1,
			"content": ""
		}
		response = self.client.post(POSTS_URL, data=payload, HTTP_X_AUTHORIZATION=self.token)
		self.assertEqual(response.status_code, 400)
	
		payload = {
			"title": "Look at this",
			"parent_content_type": "blog",
			"parent_id": 1,
			"content": None
		}
		response = self.client.post(POSTS_URL, data=payload, HTTP_X_AUTHORIZATION=self.token)
		self.assertEqual(response.status_code, 400)
		
		payload = {
			"title": "Look at this",
			"parent_content_type": "blog",
			"parent_id": 1,
			"content": " "
		}
		response = self.client.post(POSTS_URL, data=payload, HTTP_X_AUTHORIZATION=self.token)
		self.assertEqual(response.status_code, 400)

	def test_POST_result_returns_newly_created_post(self):
		payload = {
			"title": "Test",
			"parent_content_type": "blog",
			"parent_id": 1,
			"content": "This is a post. Here is  a second sentence."
		}
		response = self.client.post(POSTS_URL, data=payload, HTTP_X_AUTHORIZATION=self.token)
		self.assertEqual(response.status_code, 201)
		self.assertIn('post', response.content)
		self.assertIn('id', response.content)

	def test_can_GET_post_and_receive_fields(self):
		# Not complete
		response = self.client.get(POSTS_URL + "/1")
		self.assertIn('{', response.content)
		self.assertIn('id', response.content)
		self.assertIn('href', response.content)
		self.assertIn('sentences', response.content)
		self.assertIn('http', response.content)
		self.assertIn('parent_content_type', response.content)


class CreatingPost(TestCase):
	"""
	It should be noted that the content_type of the posts are not declared!
	The responses are all json
	"""
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
        
	def test_can_create_post_with_variable_punctuation(self):
		payload = {"title": "Some title",
					"description": "blah",
					"parent_content_type": "blog",
					"parent_id": 1,
					"content": "Emphatic sentences are punctuated like this!"}
		payload = json.dumps(payload)
		response = self.client.post(POSTS_URL, payload, content_type='application/json', HTTP_X_AUTHORIZATION=self.token)

		self.assertEqual(response.status_code, 201)
        
        
	def test_can_create_post_with_sentence_payload(self):
		payload = {"title": "Some title",
					"description": "blah",
					"parent_content_type": "blog",
					"parent_id": 1,
					"content": "Some content here. And here is my second sentence."}
		payload = json.dumps(payload)
		response = self.client.post(POSTS_URL, payload, content_type='application/json', HTTP_X_AUTHORIZATION=self.token)

		self.assertEqual(response.status_code, 201)
		jsonized_content = json.loads(response.content)

		self.assertEqual(jsonized_content['number_paragraphs'], 1)
		self.assertEqual(jsonized_content['number_sentences'], 2)

	def test_can_handle_creating_post_with_malformed_sentence_payload(self):
		# This is handled in the empty content test
		pass


	def test_can_split_input_into_paragraphs(self):
		payload = {
			"title": "Test Title",
			"parent_content_type": "blog",
			"parent_id": 1,
			"content": "Hello Mr. Jason. I am Dr. Black.\n\n\nHow is Mr. Snowden?"
		}	
		response = self.client.post(POSTS_URL, data=payload, HTTP_X_AUTHORIZATION=self.token)
		jres = json.loads(response.content)
		self.assertEqual(jres['number_paragraphs'], 2)


	def test_can_treat_code_blocks_as_extra_paragraphs(self):
		payload = {
			"title": "Test Title",
			"parent_content_type": "blog",
			"parent_id": 1,
			"content": 'Hello Mr. Jason. I am Dr. Black.\n\n\nHow is Mr. Snowden?[[[code_block]]]This is some test.\n\n\nOkay.'
		}	
		response = self.client.post(POSTS_URL, data=payload, HTTP_X_AUTHORIZATION=self.token)
		jres = json.loads(response.content)
		self.assertEqual(jres['number_paragraphs'], 5)


	def test_can_treat_AT_code_blocks_as_extra_sentences(self):
		payload = {
			"title": "Test Title",
			"parent_content_type": "blog",
			"parent_id": 1,
			"content": "Hello Mr. Jason. @[ Inline code. ]@ I am Dr. Black.\n\n\nHow is Mr. Snowden?[[[ block code. ]]]"
		}			
		response = self.client.post(POSTS_URL, data=payload, HTTP_X_AUTHORIZATION=self.token)
		jres = json.loads(response.content)
		self.assertEqual(jres['number_paragraphs'], 3)
		self.assertEqual(jres['number_sentences'], 5)


class CreatingPostOnParagraph(TestCase):
	fixtures = ['nice_fixture3.json']

	def setUp(self):
		self.client = Client()
		response = self.client.post(AUTH_URL, data=TEST_USER_ALICE_JSON, content_type='application/json')
		self.token = json.loads(response.content)['token']

	def test_create_post_on_paragraph(self):
		payload = {
			"title": "Test Title",
			"parent_content_type": "paragraph",
			"parent_id": 1,
			"content": "A post on a paragraph. This is it."
		}		
		response = self.client.post(POSTS_URL, data=payload, HTTP_X_AUTHORIZATION=self.token)
		jres = json.loads(response.content)
		self.assertEqual(jres['number_paragraphs'], 1)
		self.assertEqual(jres['number_sentences'], 2)	


class PostingOnBlogRestrictions(TestCase):
	fixtures = ['nice_fixture3.json']

	def setUp(self):
		self.client = Client()
		response = self.client.post(AUTH_URL, data=TEST_USER_ALICE_JSON, content_type='application/json')
		self.token = json.loads(response.content)['token']	

	def test_bobby_cannot_create_a_post_on_alice_restricted_blog(self):
		payload = {
			"title": "Test Title",
			"parent_content_type": "blog",
			"parent_id": 1,
			"content": "A post on a paragraph. This is it."
		}
		auth_response = self.client.post(AUTH_URL, data=TEST_USER_BOBBY_JSON, content_type='application/json')
		token = json.loads(auth_response.content)['token']
		response = self.client.post(POSTS_URL, data=payload, HTTP_X_AUTHORIZATION=token)
		self.assertEqual(response.status_code, 401)

	def test_bobby_cannot_create_a_post_on_alice_restricted_blog(self):
		payload = {
			"title": "Test Title",
			"parent_content_type": "post",
			"parent_id": 1,
			"content": "A post on a paragraph. This is it."
		}
		auth_response = self.client.post(AUTH_URL, data=TEST_USER_BOBBY_JSON, content_type='application/json')
		token = json.loads(auth_response.content)['token']
		response = self.client.post(POSTS_URL, data=payload, HTTP_X_AUTHORIZATION=token)
		self.assertEqual(response.status_code, 401)


	def test_alice_can_create_a_post_on_the_restricted_blog(self):
		payload = {
			"title": "TestTitle",
			"parent_content_type": "blog",
			"parent_id": 1,
			"content": "A post on a paragraph. This is it."
		}
		response = self.client.post(POSTS_URL, data=payload, HTTP_X_AUTHORIZATION=self.token)
		self.assertEqual(response.status_code, 201)


class PatchRequests(TestCase):
	fixtures = ['nice_fixture3.json']

	def setUp(self):
		self.client = Client()
		response = self.client.post(AUTH_URL, data=TEST_USER_ALICE_JSON, content_type='application/json')
		self.token = json.loads(response.content)['token']

	# def test_can_make_patch_request_to_post(self):
	# 	payload = {
	# 		"content": "This is some patched content."
	# 	}
	# 	response = self.client.patch(POSTS_URL, data=payload, HTTP_X_AUTHORIZATION=self.token)
	# 	self.assertEqual(response.status_code, 201)

	def test_requires_authorization(self):
		patch_request = self.client.patch(POSTS_URL + '/12345')
		self.assertEqual(patch_request.status_code, 401)

	def test_returns_not_found_on_bad_pk(self):
		patch_request = self.client.patch(POSTS_URL + '/a', HTTP_X_AUTHORIZATION=self.token)
		self.assertIn("{", patch_request.content)
		self.assertEqual(patch_request.status_code, 404)


	def test_can_make_update_to_existing_post(self):
		payload = {
			"content": "This is my sentence. This is my modified sentence. This is a third."
		}
		payload = json.dumps(payload)

		warnings.warn("Patch requests only support json")

		patch_request = self.client.patch(POSTS_URL + "/1", data=payload, HTTP_X_AUTHORIZATION=self.token, content_type='application/json')
		print(patch_request.content)
		self.assertEqual(patch_request.status_code, 201)

	def test_can_merge_with_old_sentences_in_post(self):
		post = Post.objects.get(parent_content_type=ContentType.objects.get(name="blog"),
								parent_id = 1)
		ed = Edition.objects.filter(parent = post)
		sentences = Sentence.objects.filter(edition = ed)

		test_content = ' '.join( [sentences[0].text.value, sentences[1].text.value] )
        
		test_content += ' This is a third unmerged sentence.'

		payload = {
			"content": test_content
		}
		payload = json.dumps(payload)

		warnings.warn("Patch requests only support json")

		patch_request = self.client.patch(POSTS_URL + "/1", data=payload, HTTP_X_AUTHORIZATION=self.token, content_type='application/json')
		self.assertEqual(patch_request.status_code, 201)		
		jres = json.loads(patch_request.content)
		self.assertEqual(jres['number_merged'], 2)

	def test_can_make_revisions_to_post_with_no_merging(self):
		payload = {
			"content": "This is my first sentence. This is the second sentence."
		}
		payload = json.dumps(payload)

		warnings.warn("Patch requests only support json")

		patch_request = self.client.patch(POSTS_URL + "/1", data=payload, HTTP_X_AUTHORIZATION=self.token, content_type='application/json')
		self.assertEqual(patch_request.status_code, 201)		
		jres = json.loads(patch_request.content)
		self.assertEqual(jres['number_merged'], 0)
		self.assertEqual(jres['number_sentences'], 2)