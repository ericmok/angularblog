from django.conf.urls import patterns, include, url

from django.views.generic import TemplateView

import blog.views.index
import blog.views.ember
import blog.views.register

from rest_framework import routers
from rest_framework.routers import Route, DefaultRouter
from rest_framework.urlpatterns import format_suffix_patterns

import blog.rest
from blog.rest import viewsets

router = DefaultRouter(trailing_slash = False)

router.register(r'users', viewsets.UserViewSet, base_name = 'user')
router.register(r'blogs', viewsets.BlogViewSet, base_name = 'blog')

router.register(r'posts', viewsets.PostViewSet, base_name = 'post')

router.register(r'editions', viewsets.EditionViewSet, base_name = 'edition')

router.register(r'paragraphs', viewsets.ParagraphViewSet, base_name = 'paragraph')

router.register(r'sentences', viewsets.SentenceViewSet, base_name = 'sentence')

#router.register(r'whitelists', viewsets.WhiteListViewSet, base_name = 'whitelist')

from django.shortcuts import render
def tester(template):
	def view(request):
		return render(request, template, { "request": request })
	return view


urlpatterns = patterns('',

	url(r'^/api/', include(router.urls)),

    url(r'^/api-auth/$', include('rest_framework.urls', namespace='rest_framework')),
    url(r'^/api-tokens/?', 'blog.rest.sessions.obtain_auth_token'),

    #url(r'^/?$', blog.views.index.page, name='index'),
    url(r'^/?$', blog.views.ember.index, name='index'),

    url(r'^/register/?$', blog.views.register.index, name = 'register'),
    url(r'^/sign-in/?$', blog.views.register.sign_in, name = 'sign-in'),
    url(r'^/sign-out/?$', blog.views.register.sign_out, name = 'sign-out'),

    url(r'^/tests/?$', tester("blog/jasminetests.html")),

)
