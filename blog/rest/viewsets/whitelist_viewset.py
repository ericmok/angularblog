from django.contrib.auth.models import User
from rest_framework import viewsets, mixins, status, reverse
from rest_framework.response import Response
from rest_framework.decorators import action, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated, IsAuthenticatedOrReadOnly
from django.contrib.contenttypes.models import ContentType


from blog.rest.sessions import ExpiringTokenAuthentication
from blog.rest import sessions
from blog.rest import serializers

from django.db import IntegrityError
from django.http import Http404

import json
from blog.rest.viewsets.common import PaginationError, build_collection_json_from_query, post_view, build_paginated_simple_json

from blog.models import WhiteList, Blog


# class WhiteListViewSet(viewsets.ViewSet):
#     user = serializers.UserSerializer
#     blog = serializers.BlogSerializer