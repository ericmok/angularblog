import json

ROOT_URL = 'http://localhost:8000'

AUTH_URL = ROOT_URL + '/api-tokens'

SIGNIN_URL_FRAG = '/sign-in'
SIGNIN_URL = ROOT_URL + '/sign-in'
USERS_URL = ROOT_URL + '/api/users'
BLOGS_URL = ROOT_URL + '/api/blogs'
POSTS_URL = ROOT_URL + '/api/posts'
EDITIONS_URL = ROOT_URL + '/api/editions'
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