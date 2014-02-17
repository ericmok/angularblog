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

from config import *

class InitialTest(TestCase):
	fixtures = ['nice_fixture3.json']

	def setUp(self):
		self.client = Client()

	def test_initial(self):
		self.assertEqual(1, 1)


class SessionUtilityFunctions(TestCase):
	def test_client_accepts_json(self):
		factory = RequestFactory()
		request = factory.get(AUTH_URL, CONTENT_TYPE='application/json')
		self.assertTrue( client_accepts_json(request) )

		request = factory.get(AUTH_URL, HTTP_ACCEPT='application/json')
		self.assertTrue( client_accepts_json(request) )

		request = factory.get(AUTH_URL)
		self.assertFalse( client_accepts_json(request) )

	def test_get_token_from_auth_header(self):
		from blog.rest.sessions import get_token_from_auth_header
		factory = RequestFactory()
		asdf_request = factory.post(AUTH_URL, TEST_USER_ALICE, content_type='application/json', 
									HTTP_X_AUTHORIZATION='Token asdf')

		tok = get_token_from_auth_header(asdf_request)
		self.assertEqual(tok, "asdf")

		asdf_request = factory.post(AUTH_URL, TEST_USER_ALICE, content_type='application/json', 
									HTTP_X_AUTHORIZATION='asdf')
		tok = get_token_from_auth_header(asdf_request)
		self.assertEqual(tok, "asdf")

		asdf_request = factory.post(AUTH_URL, TEST_USER_ALICE, content_type='application/json', 
									HTTP_X_AUTHORIZATION='')
		tok = get_token_from_auth_header(asdf_request)
		self.assertEqual(tok, None)


class GettingAuthToken(TestCase):
	fixtures = ['nice_fixture3.json']
	
	def setUp(self):
		self.client = Client()

	def test_can_obtain_auth_token(self):
		response = self.client.post(AUTH_URL, TEST_USER_ALICE)
		
		try:
			self.assertEqual(response.status_code, 200)
			self.assertIsNot( json.loads( response.content )['token'], None )

		except Exception as ae:
			print(ae)
			print("Content: %s" % [response.content])
			raise ae

		# Can only use content_type header lower cased!
		# response = self.client.post(AUTH_URL, TEST_USER_ALICE, CONTENT_TYPE='application/json')
		
		# try:
		# 	self.assertEqual(response.status_code, 200)
		# 	self.assertIsNot( json.loads( response.content )['token'], None )

		# except Exception as ae:
		# 	print(ae)
		# 	print("Content: %s" % [response.content])
		# 	raise ae


	def test_each_token_is_different(self):	
		first_response = self.client.post(AUTH_URL, TEST_USER_ALICE)
		second_response = self.client.post(AUTH_URL, TEST_USER_ALICE)

		try:
			self.assertEqual(first_response.status_code, 200)
			self.assertEqual(second_response.status_code, 200)

			first_token = json.loads( first_response.content )['token']
			second_token = json.loads( second_response.content )['token']
			self.assertIsNot( first_token, None )
			self.assertIsNot( second_token, None )

			# Test each token is different
			self.assertIsNot( first_token, second_token )
		except Exception as ae:
			print(ae)
			print("First: %s" % [first_response.content])
			print("Second: %s" % [second_response.content])
			raise ae

	def test_can_get_number_active_sessions_on_get_request(self):
		"""
		Also tests branching logic. It should give active sessions
		whether or not the x-auth header is set or not.
		"""
		response = self.client.get(AUTH_URL, HTTP_ACCEPT='application/json')
		self.assertIsNot( json.loads(response.content)['active_token_sessions'], None )

		response = self.client.get(AUTH_URL, HTTP_ACCEPT='application/json', 
										HTTP_X_AUTHORIZATION='asdf')
		self.assertIsNot( json.loads(response.content)['active_token_sessions'], None )

		response = self.client.get(AUTH_URL, HTTP_ACCEPT='application/json', 
										HTTP_X_AUTHORIZATION='Token asdf')
		self.assertIsNot( json.loads(response.content)['active_token_sessions'], None )

	def test_can_use_token_to_get_whether_is_logged_in_via_GET_request(self):
		"""
		Tests content_type vs accept
		"""
		response = self.client.post(AUTH_URL, data=TEST_USER_ALICE_JSON, content_type='application/json')
		token = json.loads(response.content)['token']

		response = self.client.get(AUTH_URL, HTTP_X_AUTHORIZATION=token)
		try:
			self.assertEqual(response.content, "You are logged in")
			self.assertEqual(response.status_code, 200)
		except Exception as e:
			print(response.content)
			print(Token.objects.all())
			raise e

		# Test if content_type of json could be received!
		response = self.client.post(AUTH_URL, data=TEST_USER_ALICE_JSON, 
												content_type='application/json')
		token = json.loads(response.content)['token']
		response = self.client.get(AUTH_URL, HTTP_X_AUTHORIZATION=token,
												HTTP_ACCEPT='application/json')

		self.assertIsNot(json.loads(response.content)['status'], None)


	def test_auth_GET_endpoint_says_not_logged_in_with_bad_token(self):
		response = self.client.get(AUTH_URL, HTTP_X_AUTHORIZATION='asdf', CONTENT_TYPE='application/json')
		
		self.assertEqual(response.status_code, 404)
		
		parsed = json.loads(response.content)
		self.assertFalse(parsed['status'])
		self.assertIsNot(parsed['active_token_sessions'], None)

	def test_can_delete_token(self):
		"""
		Assumes token mechanism works.
		"""
		token_response = self.client.post(AUTH_URL, data=TEST_USER_ALICE_JSON, content_type='application/json')
		token = json.loads( token_response.content )['token']

		delete_response = self.client.delete(AUTH_URL, data={}, HTTP_X_AUTHORIZATION=token)

		self.assertEqual(delete_response.status_code, 200)
		self.assertEqual(json.loads(delete_response.content)['active_token_sessions'], 0)

	def test_cannot_delete_non_existent_token(self):
		delete_response = self.client.delete(AUTH_URL, data={}, HTTP_X_AUTHORIZATION="Token asdf")
		self.assertEqual(delete_response.status_code, 404)

	def test_denies_token_on_invalid_credentials(self):
		credentials = {
			"username": "Idontexist",
			"password": "1"
		}
		bad_request = self.client.post(AUTH_URL, data=credentials)
		self.assertEqual(bad_request.status_code, 400)

		credentials = {
			"username": "asdf"
		}
		bad_request = self.client.post(AUTH_URL, data=credentials)
		self.assertEqual(bad_request.status_code, 400)


class BlogTokenTest(TestCase):
	fixtures = ['nice_fixture3.json']

	def setUp(self):
		self.client = Client()

	def test_denies_access_to_creating_blog(self):
		"""
		Assumes that blog endpoint works
		"""
		blog_payload = json.dumps( {"title": "My Blog", "creator": 1} )
		blog_request = self.client.post(BLOGS_URL, data=blog_payload, content_type='application/json')
		self.assertEqual(blog_request.status_code, 401)

class LoginPage(TestCase):	
	fixtures = ['nice_fixture3.json']

	def test_can_receive_template_on_GET_request_to_sign_in_page(self):
		response = self.client.get(SIGNIN_URL)
		self.assertEqual(response.status_code, 200)
		# Looks for some header beginning with letter L
		self.assertIsNot(re.search("\<h.*?\>[Ll]", response.content), None)


class LoginPageSelenium(LiveServerTestCase):
	fixtures = ['nice_fixture3.json']

	def setUp(self):
		self.driver = selenium.webdriver.Firefox()
		self.client = Client()

	def tearDown(self):
		self.driver.quit()
		pass

	def test_can_log_on_with_credentials(self):
		"""
		Just tests whether a redirect is made as a result of form being filled out.
		"""
		self.driver.get(self.live_server_url + SIGNIN_URL_FRAG)
		el_username = self.driver.find_element_by_name("username")
		el_password = self.driver.find_element_by_name("password")

		el_username.send_keys('alice')
		el_password.send_keys('testtest')

		el_password.send_keys(Keys.RETURN)
	
		self.assertEqual(re.search("login", self.driver.title), None)
