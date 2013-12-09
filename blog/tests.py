from django.test import TestCase
import selenium
import nltk
from django.test import Client

# Create your tests here.
class FirstTest(TestCase):
	def test_testing(self):
		self.assertEqual(True, True)


class PostViewGetTest(TestCase):
	def test_can_get_ajax(self):
		client = Client()
		response = client.get('/blog/api/posts', HTTP_X_REQUESTED_WITH = 'XMLHttpRequest', ACCEPT = "application/json", CONTENT_TYPE = "application/json")
		print(response.content)
		self.assertEqual( response.status_code, 200 )
	def test_can_post_ajax(self):
		client = Client()
		response = client.post('/blog/api/posts/', data = {}, HTTP_X_REQUESTED_WITH = 'XMLHttpRequest', ACCEPT = "application/json", CONTENT_TYPE = "application/json")
		print(response.content)
		self.assertIsNotNone(response )