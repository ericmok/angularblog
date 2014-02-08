#http://ankursethi.in/category/programming/django/

import random
import time
 
class RoundTripDelay(object):
    def process_response(self, request, response):
        time.sleep(random.random()*2)
        return response
