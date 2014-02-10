angular.module('Endpoints', ['AjaxCaching', 'Urls', 'Security'])

.factory('UsersEndpoint', function() {
	return {

	};
})

.factory('BlogsEndpoint', function($http, $q, urls, auth, RequestCache) {
	
	return {
		cache: [],
		fetch: function(id) {
			var self = this;

			for (var i = 0, n = this.cache.length; i < n; i++) {

				// id could be either a number or the blog title
				if (this.cache[i].title == id || this.cache[i].id == id) {

					console.log('Cache Hit');
					var deferred = $q.defer();
					deferred.resolve(this.cache[i]);
					return deferred.promise;
				}
			}

			return RequestCache.getURL(urls.blogs + '/' + id).then(function(response) {
				self.cache.push(response);
				return response;
			});
		},
		fetchAll: function(page) {
			return RequestCache.getURL(urls.blogs);
		},
		update: function(id, options) {

			var self = this;
			var payload = {};

			for (var key in options) {
				if (options.hasOwnProperty(key)) {
					payload[key] = options[key];
				}
			}

			return $http({
				url: urls.blogs + '/' + id,
				method: 'PATCH',
				data: payload,
				headers: {
					'X-Authorization': auth.loginToken
				}
			}).success(function(data) {

				// invalidate cache
				Array.prototype.forEach.call(self.cache, function(el) {
					if (el.title === id || el.id === id) {
						el = data;
					}
				});
			});
		}
	};
})

.factory('PostsEndpoint', function($http, $q, auth, urls, RequestCache) {
	return {
		invalidateCache: function(id) {
			RequestCache.invalidateURL(urls.posts + '/' + id);
			RequestCache.invalidateURL(urls.posts + '/' + id + '/comments');
		},
        flattenContent: function(content) {
            /*
             Flatten content sentences into a string to be put into a textarea
             */
            var flattened = '';
            
            content.paragraphs.forEach(function(paragraph, pIndex, pArray) {
                
                paragraph.sentences.forEach(function(sentence) {
                    flattened += sentence.text + ' ';
                });
                
                // Don't put new lines if there are no more paragraphs after this one
                if (pIndex !== content.paragraphs.length - 1) {
                    flattened += '\n\n\n';
                }
            });
            
            return flattened;
        },
        verifyCreate: function(content_type, id, title, content) {
            // TODO: For verifying errors with title / content before sending
        },
        
        /**
         Makes a POST request and handles authorization tokens
         TODO: Add Hashcash proof of work for POST request...
         TODO: Take a dictionary in place of these parameters...
         
         Returns: $http
         */
		create: function(content_type, id, title, content) {
			return $http({
				url: urls.posts,
				method: 'POST',
				data: {
					parent_content_type: content_type,
					parent_id: id,
					title: title,
					content: content
				},
				headers: {
					'X-Authorization': auth.loginToken
				}
			}).success(function(data) {
				console.log(data);
				console.log('Success!');
				return data;
			}).error(function(data, status, headers, config) {
				console.log(data);
				console.log('Error!');
				return data;
			});
		},
        
        /**
         Makes cached GET request
         
         Returns: RequestCache response
         */
        fetch: function(id) {
            return RequestCache.getURL(urls.posts + '/' + id);
        },
        
        /**
         The novelty of an update request. Creates a new edition resource...
         TODO: Take a dictionary
         
         Returns: $http
         */
        patch: function(id, content) {
            return $http({
                url: urls.posts + '/' + id,
                method: 'PATCH',
                data: {
                    content: content
                },
                headers: {
                    'X-Authorization': auth.loginToken
                }
            });
        }
	};
})

.factory('EditionsEndpoint', function(RequestCache, urls) {
    return {
        fetch: function(id) {
            return RequestCache.getURL(urls.editions + '/' + id);
        }
    };
})

.factory('SentencesEndpoint', function() {
	return {

	};
});