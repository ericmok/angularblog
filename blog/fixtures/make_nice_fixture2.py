"""
Accounts for paragraph models
"""

from blog.models import *
import nltk
import random
from django.db import transaction, IntegrityError
from blog.rest.viewsets.post_viewset import *

try:
	#with transaction.atomic():

		alice = User.objects.create_user(username = 'alice', password = 'testtest')
		bobby = User.objects.create_user(username = 'bobby', password = 'testtest')

		# title, creator, description, is_restricted
		blog_fixtures = [
			('Jurisprudence', alice, 'About law and stuff...', True), # 1
			('Law', alice, 'About stuff...', False), # 2
			('Equality Issues', alice, 'Heh...', False), # 3
			('Life', alice, 'No way!', False), # 4
			('Philosophy', alice, 'Deep thinking.', False), # 5
			('Science', bobby, 'Incredible Discoveries', False), # 6
			('Papers', bobby, 'Researchers come here!', False), # 7
			('Networks', bobby, 'Internets and Neurons', False), # 8
			('Optimization Problems', bobby, 'Math blog. What else.', False), # 9
		]

		for fixture in blog_fixtures:
			Blog.objects.create(title = fixture[0], creator = fixture[1], description = fixture[2], is_restricted = fixture[3])

		# title, author, parent_content_type, parent_id, is_active
		ct_blog = ContentType.objects.get(model = 'blog')
		ct_post = ContentType.objects.get(model = 'post')
		ct_sent = ContentType.objects.get(model = 'sentence')

		post_fixtures = [
			('Brown Corpus', alice, ct_blog, 1, True), 
			('Legal Obligations?', alice, ct_blog, 2, True),
			('Standards on Law', alice, ct_blog, 2, True),
			('Some post', alice, ct_blog, 3, True),
			('Descartes', alice, ct_blog, 4, True),
			('An examination of Kant', alice, ct_blog, 5, True),

			('A discovery', bobby, ct_blog, 6, True),
			('RCC Architecture', bobby,ct_blog, 7, True),
			('Internet slow', bobby, ct_blog, 8, True),
			('Algorithms for robots', bobby, ct_blog, 9, True),

			('Interesting words', bobby, ct_post, 1, True),
			('Incredible post', bobby, ct_post, 2, True),

			('Thank you', alice, ct_post, 11, True),
			('Thank you again...', alice, ct_post, 12, True),

			('Some Post', alice, ct_sent, 1, True),
			('Yeah', bobby, ct_sent, 2, True),
			('ASDF', bobby, ct_sent, 3, True),
			('Woot', bobby, ct_sent, 16, True),
		]

		chosen_counter = []

		for fixture in post_fixtures:
			print("Fixture")
			print(fixture)
			if fixture[2] == ct_blog:
				blog = ct_blog.get_object_for_this_type(pk = fixture[3])
			if fixture[2] == ct_post:
				blog = ct_post.get_object_for_this_type(pk = fixture[3]).blog
			elif fixture[2] == ct_sent:
				blog = ct_sent.get_object_for_this_type(pk = fixture[3]).sentence_set.parent.blog

			content = ''
			number_sentences = random.randrange(10,30)
			para_split = (number_sentences / 2)
			sents = nltk.corpus.brown.sents()[:number_sentences] 
			for index, words in enumerate(sents):
				content = content + (' ' .join(words)) 
				if index == para_split:
					content = content + '\n\n\n'

			create_post(title = fixture[0], author = fixture[1],
						parent_content_type = fixture[2].model, parent_id = fixture[3], content = content)


except IntegrityError as ie:
	print("ERROR: %s" + str(ie))

