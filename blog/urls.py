from django.conf.urls import patterns, include, url

from django.views.generic import TemplateView

import blog.views.index
import blog.views.register
from rest import *

router = routers.DefaultRouter()

router.register(r'users', UserViewSet, base_name = 'user')
router.register(r'posts', PostViewSet, base_name = 'post')
router.register(r'sentences', SentenceViewSet, base_name = 'sentence')
router.register(r'blogs', BlogViewSet, base_name = 'blog')


urlpatterns = patterns('',
	
    url('api/', include(router.urls)),

    url('^/?$', TemplateView.as_view(template_name = 'blog/blog.html')),
    url('test/?$', TemplateView.as_view(template_name = 'blog/test.html')),
    url('sentencer/?$', blog.views.index.index),
    
    url(r'^api-auth/', include('rest_framework.urls', namespace='rest_framework')),

    url('^register/?$', blog.views.register.index),
)
