from blog.models import *

class JSONObject():

    self.attributes = []

    def __init__(self, *args, **kwargs):
        pass

class JSONArray():

    self.items = []

    def __init__(self, *args, **kwargs):
        pass

class JSONString():
    def __init__(self, *args, **kwargs):
        pass

class JSONNumber():
    def __init__(self, *args, **kwargs):
        pass

class JSONBoolean():
    def __init__(self, *args, **kwargs):
        pass

class JSONNull():
    def __init__(self, *args, **kwargs):
        pass


class Resource(JSONObject):
    def __init__(self):
        super(JSONObject, self).__init__(self)

    def create_template(self, *args, **kwargs):
        pass

    def validate(self):
        # In this method, we go through the attributes 
        # and initialize them with request values
        # What is the validation required...
        pass

class PrimaryKey(JSONNumber):
    pass

class Hyperlink(JSONString):
    pass
    

class JSONTemplate():
    def __init__(self, *args, **kwargs):
        pass



######## POST SCENARIO ##########

request = None

# Handle Headers

def id_validator():
    pass

def title_validator():
    pass

def author_validator():
    pass

def hyperlink_validator():
    pass

json_blog = JSONTemplate()
id = JSONNumber(id_validator)
title = JSONString(title_validator)
author = JSONString(author_validator)

json_blog.attributes = [id, title, author]

json_blog.populate(request)

