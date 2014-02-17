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

class EditionEndpoint(TestCase):
	fixtures = ['nice_fixture3.json']

	def setUp(self):
		self.client = Client()

	def test_get_edition(self):
		response = self.client.get(EDITIONS_URL)
		self.assertIn('paragraphs', response.content)
		self.assertIn('sentences', response.content)

		response = self.client.get(EDITIONS_URL + '?page=1')
		self.assertIn('paragraphs', response.content)
		self.assertIn('sentences', response.content)
		self.assertIn('?page=2', response.content)

		jres = json.loads(response.content)
		self.assertEqual(len(jres['results']), 16)

	def test_get_edition_page(self):
		response = self.client.get(EDITIONS_URL + '?page=2')
		self.assertIn('paragraphs', response.content)
		self.assertIn('sentences', response.content)

		jres = json.loads(response.content)
		self.assertNotEqual(len(jres['results']), 16)

		self.assertIn('?page=1', response.content)
		self.assertNotIn('?page=3', response.content)
