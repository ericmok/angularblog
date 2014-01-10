"""
For testing paragraph viewset
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
PARAGRAPH_URL = ROOT_URL + '/api/paragraphs'
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

class ParagraphGetEndpoint(TestCase):
	fixtures = ['nice_fixture3.json']

	# def test_get_html_rest_framework(self):
	# Doesn't work, I want to get html version
	# 	client = Client()
	# 	response = client.get(PARAGRAPH_URL, content_type='text/html')
	# 	self.assertIn('Paragraph Instance', response.content)
	# 	self.assertIn('sentences', response.content)

	def test_get_json(self):
		client = Client()
		response = client.get(PARAGRAPH_URL, content_type='application/json')
		self.assertIn('{', response.content)
		self.assertIn('sentences', response.content)
