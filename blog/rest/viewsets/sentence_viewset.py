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

from blog.models import Sentence
from blog.rest.serializers import serialize_sentence

class SentenceViewSet(viewsets.GenericViewSet):

    def list(self, request):
        pagination = request.GET.get('page', None)
        if pagination is not None:
            limit = pagination
        else:
            pagination = 16
        sentences = Sentence.objects.all()[:pagination]


        #return_json = build_collection_json_from_query(request, sentences, sentence_collection_serializer)
        return_json = build_paginated_simple_json(request, sentences, serialize_sentence, results = 'results')

        return Response(return_json, status = 200)



    def retrieve(self, request, pk = None):
        try:
            pk = int(pk)
        except:
            return Response({"detail": "Not found"}, status = 404)

        sentence = Sentence.objects.get(pk = pk)
        # previous_version
        # sentence_set
        # text 
        # ordering
        return_json = serialize_sentence(sentence)

        return Response(return_json, status = 200)

    @action(methods=['GET'])
    def posts(self, request, pk = None):
        return post_view("sentence", request, pk)