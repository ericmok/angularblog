"""
syncdb, loaddata fixture.json, shell > import this file

Run this file from manage.py shell to generate lots of posts.
Make sure to load fixture.json first
"""

from blog.models import *
import random

print("MAKING")

for a in range(0,60):
	p = Post.objects.create(title="Some Post %s" % (str(random.random())), author = User.objects.get(pk = 1),
								parent_id = 1, parent_content_type = ContentType.objects.get(name = 'blog'))
	ss = SentenceSet.objects.create(parent = p)
	print("Status a: %s" % (a,))

ss = SentenceSet.objects.get(parent = 1)

for b in range(0,50):
	txt = Text.objects.create(value = "%s" % (random.random()))
	sen = Sentence.objects.create(sentence_set = ss, text = txt, ordering = b + 1)
	print("Status b: %s" % (b,))