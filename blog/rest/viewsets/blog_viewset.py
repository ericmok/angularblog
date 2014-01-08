from django.contrib.auth.models import User
from rest_framework import viewsets, mixins, status, reverse
from rest_framework.response import Response
from rest_framework.decorators import action, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated, IsAuthenticatedOrReadOnly
from django.contrib.contenttypes.models import ContentType

from blog.rest.sessions import ExpiringTokenAuthentication
from blog.rest import sessions
from blog.rest.serializers import BlogSerializer, BlogPaginationSerializer

from django.db import IntegrityError
from django.http import Http404

import json
from blog.rest.viewsets.common import PaginationError, build_collection_json_from_query, build_paginated_json, post_view

from blog.models import *
import re

class BlogViewSet(viewsets.GenericViewSet, 
                  mixins.CreateModelMixin,
                  mixins.ListModelMixin, 
                  mixins.RetrieveModelMixin):
    authentication_classes = (ExpiringTokenAuthentication,)
    queryset = Blog.objects.all()
    serializer_class = BlogSerializer

    def list(self, request):
        #return_json = build_collection_json_from_query(request, Blog.objects.all(), 
        # return_json = build_paginated_json(request, Blog.objects.all(), 
        #                                     lambda b: {
        #                                         'id': b.id,
        #                                         'href': request.build_absolute_uri("blogs/" + str(b.id)),
        #                                         'title': b.title
        #                                         })

        # return_json['template'] = {}
        # return_json['template']['post'] = {"title": "(String) Name of the blog"} 

        # return Response(return_json, status = 200)
        lst = Blog.objects.all()
        page = self.paginate_queryset(lst)
        if page is not None:
            #serializer = self.get_pagination_serializer(page)
            serializer = BlogPaginationSerializer(page, context = {'request': request})
        else:
            serializer = self.get_serializer(lst, many=True, context = {'request': request})

        serializer.data['href'] = request.build_absolute_uri('')
        serializer.data['template'] = [
            {"post": [
                {"title": "(String) Name of the Blog"}
            ]
            }
        ]
        return Response(serializer.data)


    def create(self, request):
        if request.user is None:
            return Response({"detail": "Authorization required"}, status = 401)
        blog_serializer = BlogSerializer(data = request.DATA)
        if blog_serializer.is_valid():
            try:

                # Duplication check 
                # TODO: Test this code
                duplicate_title_check = re.sub('[\-\_]', ' ', blog_serializer.object.title)
                duplicate_title_check = duplicate_title_check.lower()
                if len( Blog.objects.filter(title__iexact = duplicate_title_check) ) > 0:
                    raise IntegrityError

                new_blog = Blog.objects.create(title = blog_serializer.object.title, creator = request.user)
                return Response({"status": "Created: %s" % (blog_serializer.object.title,)}, status = 201)
            except IntegrityError:
                return Response({"error": "A blog with that name already exists."}, status = 409)
        else:
            return Response(blog_serializer.errors, status = 400)

    def retrieve(self, request, pk = None):
        try: 
            try:
                pk = int (pk)
                blog = Blog.objects.get(pk = pk)
            except ValueError:
                title = re.sub('[\-\_]', ' ', pk)
                title = title.lower()
                blog = Blog.objects.get(title__iexact = title)
        except Blog.DoesNotExist:
            return Response({"detail": "Not found"}, status = 404)

        blog_serializer = BlogSerializer(blog, context = {'request': request})
        return Response(blog_serializer.data, status = 200)

    @action(methods=['GET'])
    def comments(self, request, pk = None):
        return post_view(self, request, "blog", pk)
