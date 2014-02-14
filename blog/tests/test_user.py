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
from blog.rest.viewsets.common import *

import hashlib

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
        
        
class UserViewsetTests(TestCase):
    fixtures = ['nice_fixture3.json']

    def setUp(self):
        self.client = Client()
        
    def test_fails_to_make_user_without_hash_cash(self):
        response = self.client.post(USERS_URL, content_type='application/json', data=json.dumps({'username': 'asdfasdf', 'password': 'password'}))
        self.assertIn('Proof of work missing', response.content)
        self.assertEqual(response.status_code, 400)
        
    def test_fails_to_fake_hash(self):
        payload = {
            'username': 'asdfasdf',
            'password': 'password'
        }
        response = self.client.post(USERS_URL, content_type='application/json', 
                                                data=json.dumps({'username': 'asdfasdf', 'password': 'password'}),
                                                HTTP_UNIQUE = 'username ')
        self.assertIn('token', response.content)
        
        response = self.client.post(USERS_URL, content_type='application/json', 
                                                data=json.dumps({'username': 'asdfasdf', 'password': 'password'}),
                                               HTTP_UNIQUE = 'asdf 3 asdg')
        self.assertIn('Proof of work for field not valid', response.content)
        self.assertEqual(response.status_code, 400)        
        
        response = self.client.post(USERS_URL, content_type='application/json', 
                                                data=json.dumps({'username': 'asdfasdf', 'password': 'password'}),
                                                HTTP_UNIQUE = 'username 3 asdg')
        self.assertIn('Proof of work failed', response.content)
        self.assertEqual(response.status_code, 400)
        
    def test_can_create_user_with_hash(self):
        payload = {
            'username': 'asdfasdf',
            'password': 'password'
        }
        counter = -1
        not_found = True
        
        while not_found:
            counter += 1
            hsh = str(hashlib.md5('asdfasdf' + str(counter)).hexdigest())
            #print('hsh', hsh)
            if hsh[0] == '0' and hsh[1] == '0' and hsh[2] == '0':
                not_found = False
            
        hash_cash = hashlib.md5('asdfasdf' + str(counter))
        response = self.client.post(USERS_URL, content_type='application/json', 
                                                data=json.dumps({'username': 'asdfasdf', 'password': 'password'}),
                                                HTTP_UNIQUE = 'username ' + str(counter) + ' ' + hsh)
        #print('Created?', response.content)
        self.assertEqual(response.status_code, 201)