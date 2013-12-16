from django.conf.urls import patterns, include, url

from django.views.generic import TemplateView

import blog.views.index
import blog.views.register

from rest_framework import routers
from rest_framework.routers import Route, DefaultRouter
from rest_framework.urlpatterns import format_suffix_patterns
from rest2 import *


router = DefaultRouter(trailing_slash = False)

router.register(r'users', viewsets.UserViewSet, base_name = 'user')
router.register(r'blogs', viewsets.BlogViewSet, base_name = 'blog')
#router.register(r'sessions', sessions.SessionViewSet, base_name = 'session')
router.register(r'posts', viewsets.PostViewSet, base_name = 'post')
router.register(r'sentences', viewsets.SentenceViewSet, base_name = 'sentence')
# router.register(r'sentences', sentences.SentenceViewSet, base_name = 'sentence')
# router.register(r'blogs', blogs.BlogViewSet, base_name = 'blog')

#router_with_no_slashes = routers.DefaultRouter(trailing_slash = False)
#router_with_no_slashes.register(r'users', viewsets.UserViewSet, base_name = 'user')
#router_with_no_slashes.register(r'blogs', viewsets.BlogViewSet, base_name = 'blog')
#router_with_no_slashes.register(r'sessions', sessions.SessionViewSet, base_name = 'session')
#router_with_no_slashes.register(r'posts', viewsets.PostViewSet, base_name = 'post')




from django.shortcuts import render
def tester(template):
	def view(request):
		return render(request, template, { "request": request })
	return view


urlpatterns = patterns('',
	
	url(r'^/api/', include(router.urls)),
    #url(r'^api/', include(router_with_no_slashes.urls)),

    #url(r'^/api/sentences', )
    #url(r'^/api/sentences/(?<pk>\d*))

    url(r'^/test/?$', TemplateView.as_view(template_name = 'blog/test.html')),
    url(r'^/sentencer/?$', blog.views.index.index),
    
    url(r'^/api-auth/$', include('rest_framework.urls', namespace='rest_framework')),
    url(r'^/api-tokens/?', 'blog.rest2.sessions.obtain_auth_token'),
    

    url(r'^/?$', blog.views.index.page, name='index'),

    url(r'^/register/?$', blog.views.register.index, name = 'register'),
    url(r'^/sign-in/?$', blog.views.register.sign_in, name = 'sign-in'),
    url(r'^/sign-out/?$', blog.views.register.sign_out, name = 'sign-out'),
    
    url(r'^/tests/user/?$', tester("blog/ajaxtester.html")),
    url(r'^/tests/blog/?$', tester("blog/jasminetests.html")),

)
