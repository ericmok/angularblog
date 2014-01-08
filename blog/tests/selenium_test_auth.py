from django.test import TestCase, Client, LiveServerTestCase
import selenium
from selenium import webdriver
from selenium.webdriver.common.keys import Keys
import nltk
import json
from django.contrib.auth.models import User

from blog.models import *

import pdb


class SigningIn(LiveServerTestCase):
	fixtures = ['nice_fixture3.json']

	def setUp(self):
		self.browser = webdriver.Firefox()
		self.addCleanup(self.browser.quit)


	def test_can_open_selenium(self):
		self.browser.get(USERS_URL)

		print(self.browser)

		el_username = self.browser.find_element_by_name("username")
		el_password = self.browser.find_element_by_name("password")

		self.assertTrue(self.browser.title is not None)
		self.assertIsNot(el_username, None)