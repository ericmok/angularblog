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

from config import *

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
