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

from blog.models import Sentence, Post
from blog.rest.serializers import serialize_sentence, PostPaginationSerializer

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
    def all_comments(self, request, pk = None):
        # TODO: Write a test for this
        try:
            pk = int(pk)
            #post = Post.objects.get(pk = pk)
            sentence = Sentence.objects.get(pk = pk)
        except ValueError:
            return Response({"detail": "Not found"}, status = 404)

        page = request.GET.get('page', 0)

        sentence_ct = ContentType.objects.get(model = 'sentence')

        # Stores all the recursive sentence ids to be used as later query
        previous_versions = [pk]

        previous_sentence = sentence.previous_version

        # Recursive search breaks when there are no more ancestors
        # The next ancestor is visited on the last line of the while block
        while previous_sentence is not None:
            previous_versions.append(previous_sentence.id)

            # Visit ancestor
            previous_sentence = previous_sentence.previous_version

        query = Post.objects.filter(parent_content_type = sentence_ct, parent_id__in = previous_versions).order_by('-created')
        # [page * 16 : (page * 16) + 1]

        # Raises 404 on any errors regarding page numbers!
        page = self.paginate_queryset(query)
        serialized = PostPaginationSerializer(page, context = {'request': request})
        return_json = serialized.data

        return_json['href'] = request.build_absolute_uri('')

        return Response( return_json, status = 200 )


    @action(methods=['GET'])
    def comments(self, request, pk = None):
        return post_view(self, request, 'sentence', pk)