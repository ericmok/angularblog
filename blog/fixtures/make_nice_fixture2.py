# -*- coding: utf-8 -*-
"""
Accounts for paragraph models
"""

from blog.models import *
import nltk
import random
from django.db import transaction, IntegrityError
from blog.rest.viewsets.post_viewset import *


corpus = """
It is an extraordinary privilege to be able to introduce a previously unpublished essay by H. L. A. Hart, one of the most distinguished figures in twentieth-century legal philosophy, alongside a fine commentary by Geoffrey Shaw, the scholar whose intellectual imagination and meticulous archival research has brought the essay to light. It is particularly apt that H. L. A. Hart’s essay should be published by this Review, appearing fifty-seven years after it was written in the early months of his visit to Harvard, thus joining a distinguished tradition of posthumously published scholarship of the 1950s, most notably Lon Fuller’s The Forms and Limits of Adjudication, and Henry Hart and Albert Sacks’s The Legal Process. Its publication is also timely, albeit long delayed, in that it comes hard on the heels of a period in which the intellectual history of legal thought has been the subject of wide interest and some very powerful scholarship.

Hart’s year at Harvard significantly shaped the course of his subsequent work. The essay now being published, entitled Discretion, helps to explain why that was the case, for it is a testimony to the intensity of his engagement with colleagues in the Law School. During the course of the year, he laid the foundations for the vast majority of his work over the next decade: for Causation in the Law, for The Concept of Law, and for Punishment and Responsibility. The stimulating American context, as he later put it, “relaxed one’s neuroses”; “[i]deas started pullulating at a rather alarming rate. I thought, ‘Am I going mad?’: I was getting so many different things inside.”

In his Essay, Shaw presents a searching analysis of the paper’s argument as well as a persuasive assessment of its overall significance, and I do not propose to tread the same ground. In this brief introduction, I shall rather reflect, from a biographer’s viewpoint, on the significance of Discretion for our understanding of the trajectory of Hart’s ideas and on the significance of his year at Harvard. I shall then move on to consider the intriguing question of why Hart did not subsequently publish or build on some of the key insights in the paper itself. Here I highlight the fact that, almost uniquely in Hart’s work, Discretion features a notable emphasis on the significance of institutional factors in our understanding of the nature of legal decisionmaking; and I argue that Hart’s failure fully to develop this insight in the essay, or to build on it in his subsequent work, derives from the fact that such a development would have necessitated a diversion from the philosophical issues that were his core intellectual concern, and moreover would have presented certain dangers to his conception of legal positivism. I shall conclude by considering what contribution the essay makes to our overall interpretation and evaluation of Hart’s legal philosophy.

The United States government leaks like a sieve. Presidents denounce the constant flow of classified information to the media from unauthorized, anonymous sources. National security professionals decry the consequences. And yet the laws against leaking are almost never enforced. Throughout U.S. history, roughly a dozen criminal cases have been brought against suspected leakers. There is a dramatic disconnect between the way our laws and our leaders condemn leaking in the abstract and the way they condone it in practice.

This Article challenges the standard account of that disconnect, which emphasizes the difficulties of apprehending and prosecuting offenders, and advances an alternative theory of leaking.

This Essay analyzes an essay by H. L. A. Hart about discretion that has never before been published, and has often been considered lost. Hart, one of the most significant legal philosophers of the twentieth century, wrote the essay at Harvard Law School in November 1956, shortly after he arrived as a visiting professor. In the essay, Hart argued that discretion is a special mode of reasoned, constrained decisionmaking that occupies a middle ground between arbitrary choice and determinate rule application. Hart believed that discretion, soundly exercised, provides a principled way of coping with legal indeterminacy that is fully consistent with the rule of law. This Essay situates Hart’s paper — Discretion — in historical and intellectual context, interprets its main arguments, and assesses its significance in jurisprudential history.

For example, I have not included the psychological question raised by Professor Freund: what are the psychological conditions of a sound use of discretion? I have omitted this because I believe that if we clearly understand what it is to exercise a discretion and what in different fields counts as the satisfactory exercise of a discretion, we shall not really have to face an independent psychological question of the form: what are the psychological conditions of its sound exercise or how are we psychologically able to exercise a discretion? Indeed, I think this question, which looks on the surface to be one of empirical psychology, perhaps really expresses in a rather misleading form just our initial unclarity about what discretion is and what in various fields we count as a sound exercise of discretion. But only further exploration of our subject will show whether I am right in this, and I may very well not be right.

The Federal Convention convened in the State House (Independence Hall) in Philadelphia on May 14, 1787, to revise the Articles of Confederation. Because the delegations from only two states were at first present, the members adjourned from day to day until a quorum of seven states was obtained on May 25. Through discussion and debate it became clear by mid-June that, rather than amend the existing Articles, the Convention would draft an entirely new frame of government. All through the summer, in closed sessions, the delegates debated, and redrafted the articles of the new Constitution. Among the chief points at issue were how much power to allow the central government, how many representatives in Congress to allow each state, and how these representatives should be elected--directly by the people or by the state legislators. The work of many minds, the Constitution stands as a model of cooperative statesmanship and the art of compromise.

Each House shall be the Judge of the Elections, Returns and Qualifications of its own Members, and a Majority of each shall constitute a Quorum to do Business; but a smaller Number may adjourn from day to day, and may be authorized to compel the Attendance of absent Members, in such Manner, and under such Penalties as each House may provide.

Each House may determine the Rules of its Proceedings, punish its Members for disorderly Behaviour, and, with the Concurrence of two thirds, expel a Member.

Each House shall keep a Journal of its Proceedings, and from time to time publish the same, excepting such Parts as may in their Judgment require Secrecy; and the Yeas and Nays of the Members of either House on any question shall, at the Desire of one fifth of those Present, be entered on the Journal.

Neither House, during the Session of Congress, shall, without the Consent of the other, adjourn for more than three days, nor to any other Place than that in which the two Houses shall be sitting.

The Senators and Representatives shall receive a Compensation for their Services, to be ascertained by Law, and paid out of the Treasury of the United States. They shall in all Cases, except Treason, Felony and Breach of the Peace, be privileged from Arrest during their Attendance at the Session of their respective Houses, and in going to and returning from the same; and for any Speech or Debate in either House, they shall not be questioned in any other Place.

No Senator or Representative shall, during the Time for which he was elected, be appointed to any civil Office under the Authority of the United States, which shall have been created, or the Emoluments whereof shall have been encreased during such time; and no Person holding any Office under the United States, shall be a Member of either House during his Continuance in Office.

All Bills for raising Revenue shall originate in the House of Representatives; but the Senate may propose or concur with Amendments as on other Bills.

Every Bill which shall have passed the House of Representatives and the Senate, shall, before it become a Law, be presented to the President of the United States: If he approve he shall sign it, but if not he shall return it, with his Objections to that House in which it shall have originated, who shall enter the Objections at large on their Journal, and proceed to reconsider it. If after such Reconsideration two thirds of that House shall agree to pass the Bill, it shall be sent, together with the Objections, to the other House, by which it shall likewise be reconsidered, and if approved by two thirds of that House, it shall become a Law. But in all such Cases the Votes of both Houses shall be determined by yeas and Nays, and the Names of the Persons voting for and against the Bill shall be entered on the Journal of each House respectively. If any Bill shall not be returned by the President within ten Days (Sundays excepted) after it shall have been presented to him, the Same shall be a Law, in like Manner as if he had signed it, unless the Congress by their Adjournment prevent its Return, in which Case it shall not be a Law.

Every Order, Resolution, or Vote to which the Concurrence of the Senate and House of Representatives may be necessary (except on a question of Adjournment) shall be presented to the President of the United States; and before the Same shall take Effect, shall be approved by him, or being disapproved by him, shall be repassed by two thirds of the Senate and House of Representatives, according to the Rules and Limitations prescribed in the Case of a Bill.
"""

det = nltk.load('tokenizers/punkt/english.pickle')
corpus = det.tokenize(corpus)

print("CORPUS: %s" % [corpus])

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

			number_sentences = random.randrange(10,25)
			para_split = (number_sentences / 2)

			for counter in range(0, number_sentences):

				content = content + corpus[random.randrange(0, number_sentences)] + " "

				if counter == para_split:
					content = content + '\n\n\n'

			content = content.strip()

			print("Content:",content)
			create_post(title = fixture[0], author = fixture[1],
						parent_content_type = fixture[2].model, parent_id = fixture[3], 
						content = content)


except IntegrityError as ie:
	print("ERROR: %s" + str(ie))

