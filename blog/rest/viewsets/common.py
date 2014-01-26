import json
from blog.rest.serializers import *
from blog.models import *
from django.conf import settings
from rest_framework.response import Response
from rest_framework.decorators import action
import urllib

class PaginationError(Exception):
    pass


def build_paginated_simple_json(request, query_set, per_model_serializer_callback, results = 'results'):
    """
    Builds a paginated response in the format that django rest framework uses. 
    I don't like it, but the sake of speed, I'll just have to use this.

    Returns a json that can be further edited (such as template, debug properties)

    Throws PaginationError on cases 
    1) page parameter is not an int
    2) page is out of bounds (too low or too high)

    Sets the following keys:
    debug (for debugging)
    collection {
        version, href, links, template, size, items
    }

    @per_model_serializer_callback A callback to be used to serialize a model of the query_set to a python dict
    The callback takes a single argument which is the singular django model of the query_set.
    """
    # Pagination:
    # For queries returning large number of items
    # show only a subset of the items with an upper bound limit to size
    # as determined by settings
    # User can offer a page parameter to provide an offset
    # Paginate by settings.REST_FRAMEWORK['PAGINATE_BY']
    try:
        page = int( request.GET.get('page', 1) )
    except ValueError:
        raise PaginationError()

    page_size = settings.REST_FRAMEWORK['PAGINATE_BY']
    offset = ( (page - 1) * page_size )

    # Get the query set size and check if pagination is valid
    size = len( query_set )

    # Check if offset is not too low
    # To check of offset is too high
    if (offset < 0) or (offset > size):
        raise PaginationError()


    result_set = query_set[offset : offset+page_size]


    return_json = {}

    return_json['href'] = '%s' % (request.build_absolute_uri(""),)
  

    # Display next link if offset + page_size is still less than size of result_set
    # len(result_set) vs page_size
    if offset + page_size < size:
        return_json['next'] = request.build_absolute_uri().split("?")[0] + ('?page=%s' % (page + 1,))
    else:
        return_json['next'] = None

    if offset > 1:
        return_json['prev'] = request.build_absolute_uri().split("?")[0] + ('?page=%s' % (page - 1,))
    else:
        return_json['prev'] = None

    # This will have to be set on case by case basis
    return_json['template'] = {}

    return_json['count'] = size
    return_json[results] = []

    for q in result_set:
        return_json[results].append( per_model_serializer_callback(q) )

    # return_json['debug'] = {}
    # return_json['debug']['offset'] = offset
    # return_json['debug']['page_size'] = page_size
    # return_json['debug']['size'] = size

    return return_json


def build_paginated_json(request, query_set, per_model_serializer_callback):
    """
    Builds a paginated response.

    Returns a json that can be further edited (such as template, debug properties)

    Throws PaginationError on cases 
    1) page parameter is not an int
    2) page is out of bounds (too low or too high)

    Sets the following keys:
    debug (for debugging)
    collection {
        version, href, links, template, size, items
    }

    @per_model_serializer_callback A callback to be used to serialize a model of the query_set to a python dict
    The callback takes a single argument which is the singular django model of the query_set.
    """
    # Pagination:
    # For queries returning large number of items
    # show only a subset of the items with an upper bound limit to size
    # as determined by settings
    # User can offer a page parameter to provide an offset
    # Paginate by settings.REST_FRAMEWORK['PAGINATE_BY']
    try:
        page = int( request.GET.get('page', 1) )
    except ValueError:
        raise PaginationError()

    page_size = settings.REST_FRAMEWORK['PAGINATE_BY']
    offset = ( (page - 1) * page_size )

    # Get the query set size and check if pagination is valid
    size = len( query_set )

    # Check if offset is not too low
    # To check of offset is too high
    if (offset < 0) or (offset > size):
        raise PaginationError()


    result_set = query_set[offset : offset+page_size]


    return_json = {}

    return_json['href'] = '%s' % (request.build_absolute_uri(""),)

    return_json['links'] = {}    

    # Display next link if offset + page_size is still less than size of result_set
    # len(result_set) vs page_size
    if offset + page_size < size:
        return_json['links']['next'] = request.build_absolute_uri().split("?")[0] + ('?page=%s' % (page + 1,))
    else:
        return_json['links']['next'] = None

    if offset > 1:
        return_json['links']['prev'] = request.build_absolute_uri().split("?")[0] + ('?page=%s' % (page - 1,))
    else:
        return_json['links']['prev'] = None

    # This will have to be set on case by case basis
    return_json['template'] = {}

    return_json['count'] = size
    return_json['items'] = []

    for q in result_set:
        return_json['items'].append( per_model_serializer_callback(q) )

    # return_json['debug'] = {}
    # return_json['debug']['offset'] = offset
    # return_json['debug']['page_size'] = page_size
    # return_json['debug']['size'] = size

    return return_json


def build_collection_json_from_query(request, query_set, per_model_serializer_callback):
    """
    Builds a skeleton collection data structure to be used for JSON serialization as based
    on amundsen's collection+json format.

    Sets up pagination and links.

    Returns a json that can be further edited (such as template, debug properties)

    Throws PaginationError on cases 
    1) page parameter is not an int
    2) page is out of bounds (too low or too high)

    Sets the following keys:
    debug (for debugging)
    collection {
        version, href, links, template, size, items
    }

    @per_model_serializer_callback A callback to be used to serialize a model of the query_set to a python dict
    The callback takes a single argument which is the singular django model of the query_set.
    """
    # Pagination:
    # For queries returning large number of items
    # show only a subset of the items with an upper bound limit to size
    # as determined by settings
    # User can offer a page parameter to provide an offset
    # Paginate by settings.REST_FRAMEWORK['PAGINATE_BY']
    try:
        page = int( request.GET.get('page', 1) )
    except ValueError:
        raise PaginationError()

    page_size = settings.REST_FRAMEWORK['PAGINATE_BY']
    offset = ( (page - 1) * page_size )

    # Get the query set size and check if pagination is valid
    size = len( query_set )

    # Check if offset is not too low
    # To check of offset is too high
    if (offset < 0) or (offset > size):
        raise PaginationError()


    result_set = query_set[offset : offset+page_size]


    return_json = {}
    return_json['collection'] = {}
    return_json['collection']['version'] = 1.0

    return_json['collection']['href'] = '%s' % (request.build_absolute_uri(""),)

    return_json['collection']['links'] = []

    # Display next link if offset + page_size is still less than size of result_set
    # len(result_set) vs page_size
    if offset + page_size < size:
        return_json['collection']['links'].append( {'rel': 'next', 'href': request.build_absolute_uri().split("?")[0] + ('?page=%s' % (page + 1,))} )

    if offset > 1:
        return_json['collection']['links'].append( {'rel': 'prev', 'href': request.build_absolute_uri().split("?")[0] + ('?page=%s' % (page - 1,))} )

    # This will have to be set on case by case basis
    return_json['collection']['template'] = {}

    return_json['collection']['size'] = size
    return_json['collection']['items'] = []

    for q in result_set:
        return_json['collection']['items'].append( per_model_serializer_callback(q) )

    # return_json['debug'] = {}
    # return_json['debug']['offset'] = offset
    # return_json['debug']['page_size'] = page_size
    # return_json['debug']['size'] = size

    return return_json


def post_view(this, request, model_name, pk):
    try:
        pk = int(pk)
        #post = Post.objects.get(pk = pk)
    except ValueError:
        return Response({"detail": "Not found"}, status = 404)

    parent_ct = ContentType.objects.get(model = model_name)

    post_posts = Post.objects.filter(parent_content_type = parent_ct, parent_id = pk).order_by('-created')

    # Raises 404 on any errors regarding page numbers!
    page = this.paginate_queryset(post_posts)
    serialized = PostPaginationSerializer(page, context = {'request': request})
    return_json = serialized.data

    return_json['href'] = request.build_absolute_uri('')

    return Response( return_json, status = 200 )


def get_comments_on_sentences_of_sentence_set(ss):
    """
    In the future, we may want to expand functionality related to post versioning
    """
    comments = []

    sentences = Sentence.objects.filter(sentence_set = ss)

    sentence_ct = ContentType.objects.get(model = 'sentence')

    for sentence in sentences:
        sentence_comments = Post.objects.filter(parent_content_type = sentence_ct, parent_id = sentence.pk)

        for comment in sentence_comments:
            comments.append( comment )

    return comments

def pagination_example():
    try:
        pk = int(pk)
    except:
        return Response({"detail": "Not found"}, status = 404)

    query = Post.objects.filter(parent_content_type = ContentType.objects.get(model = model_name), parent_id = pk).order_by('-created')

    try:
        def serialize_post(m):
            return {"id": m.id, 
                    "title": m.title, 
                    "brief": m.get_brief(),
                    "created": m.created,
                    "href": '/blog/api/posts/%s' % (m.id,) }
        return_json = build_paginated_simple_json(request, query, serialize_post)
    except PaginationError:
        return Response({"detail": "Not found"}, status = 404)

    return return_json