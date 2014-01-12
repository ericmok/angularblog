from django.contrib.auth.models import User
from rest_framework import viewsets, mixins, status, reverse
from rest_framework.response import Response
from rest_framework.decorators import action, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated, IsAuthenticatedOrReadOnly
from django.contrib.contenttypes.models import ContentType


from blog.rest.sessions import ExpiringTokenAuthentication
from blog.rest import sessions
from blog.rest import serializers


from django.db import IntegrityError, transaction
from django.http import Http404

import json
from blog.rest.viewsets.common import PaginationError, build_collection_json_from_query, post_view
from blog.rest.serializers import serialize_edition
from blog.models import *

import re

import collections
from django.db.models import F
from django.core.paginator import Paginator, InvalidPage, PageNotAnInteger, EmptyPage

from django.http import QueryDict
import urlparse

from collections import OrderedDict

class EditionViewSet(viewsets.GenericViewSet):
    
    authentication_classes = (ExpiringTokenAuthentication,)
    
    NOT_FOUND_JSON = {"detail": "Not Found"}
    MUST_BE_AUTHOR_OF_POST_JSON = {"detail": "You have to be the author to patch this post."}
    CONTENT_TO_SHORT_JSON = {"error": "Content too short."}


    def list(self, request):
        
        # Sorted by -created date
        editions = Edition.objects.all()

        return_json = OrderedDict([('href', request.build_absolute_uri('')),
                                   ('count', len(editions)),
                                   ('next', None),
                                   ('previous', None),
                                   ('template', {}),
                                   ('results', [])])

        request_page = request.GET.get('page', 1)

        try:
            page = Paginator(editions, 16, allow_empty_first_page=False).page(request_page)
        except InvalidPage:
            raise Http404("Invalid page")
        except PageNotAnInteger:
            raise Http404("Page not a number")
        except EmptyPage:
            raise Http404("Empty page") 


        for ed in page.object_list:
            return_json['results'].append( serialize_edition(ed) )

        if page.has_next():
            parseResult = urlparse.urlparse(request.build_absolute_uri(''))
            qd = QueryDict(parseResult.query).copy()
            qd['page'] = int(request_page) + 1
            query = qd.urlencode()
            return_json['next'] = urlparse.urlunsplit((parseResult.scheme, parseResult.netloc, parseResult.path, query, parseResult.fragment))
        else:
            return_json['next'] = None

        if page.has_previous():
            parseResult = urlparse.urlparse(request.build_absolute_uri(''))
            qd = QueryDict(parseResult.query).copy()
            qd['page'] = int(request_page) - 1
            query = qd.urlencode()
            return_json['previous'] = urlparse.urlunsplit((parseResult.scheme, parseResult.netloc, parseResult.path, query, parseResult.fragment))
        else:
            return_json['previous'] = None


        return Response(return_json)


    def retrieve(self, request, pk = None):
        try:
            pk = int(pk)
        except ValueError:
            raise Http404("Pk not valid")

        try:
            edition = Edition.objects.get(pk = pk)
        except Edition.DoesNotExist:
            raise Http404("Not found.")

        return_json = serialize_edition(edition)

        return Response(return_json, 200)

