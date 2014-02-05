
angular.module("AjaxCaching", [])

.factory("UrlCache", function() {
	var urlCache = [];

	return {
		data: urlCache,
		urlInCache: function(url) {
			for (var i = 0; i < urlCache.length; i++) {
				if (urlCache[i].url == url) {
					return true;
				}
			}
			return false;
		},
		setURL: function(url, value) {
			if (!this.urlInCache(url)) {
				urlCache.push({
					url: url,
					value: value
				});
			}
		},
		getURL: function(url) {
			console.log("get urlcache:", urlCache);
			for (var i = 0; i < urlCache.length; i++) {
				if (urlCache[i].url == url) {
					return urlCache[i].value;
				}
			}
			return null;
		}
	};

})

.factory('RequestCache', ["$http", "$q", "UrlCache", function($http, $q, UrlCache) {
	return {
		getURL: function(url) {
			console.log("getURL:", url);
			var cache = UrlCache.getURL(url);
			if (cache === null) {
				return $http.get(url).then(function(json) {
					UrlCache.setURL(url, json.data);
					return json.data;
				});
			}
			else {
				console.log("Cache hit");
				var deferred = $q.defer();
				deferred.resolve(cache);
				return deferred.promise;
			}
		}
	};
}])

.factory('Api', ["$http", "$q", "RequestCache", function($http, $q, RequestCache) {

	return {
		main: null,
		sidebar: {},

		getPost: function(id) {
			console.log("getPost id:", id);
			return RequestCache.getURL("/blog/api/posts/" + id);
		},
		getSentencePosts: function(id) {
			return RequestCache.getURL("/blog/api/sentences/" + id + "/comments");
		},
		getSentenceComments: function(sentenceId) {
			return RequestCache.getURL("/blog/api/sentences/" + sentenceId + "/comments");
		},
		getParentOfPost: function(model) {
			console.log("get parent of post:");
			console.log(model);

			if (model.content_type == "post") {

				console.log("get parent of post is post test pasts");

				if (model.parent_content_type == "blog" || 
					model.parent_content_type == "post" ||
					model.parent_content_type == "sentence") {
					
					var url = "/blog/api/" + model.parent_content_type + "s/" + model.parent_id;
					console.log("fetching url>", url);

					return RequestCache.getURL(url);
				}
			}


			console.log("get parent of post, not a post model");
			// This model is not a post, return a reject
			var deferred = $q.defer();
			deferred.reject(null);
			return deferred.promise;
		
		}
	};
}])



.factory('SentenceSelection', function(Api) {
	var selection = null;
	return {
		setSelection: function(inSelection) {
			selection = inSelection;
			//Api.getSentenceComments(inSelection.id).then(function(json) {
			//	Api.sidebar = json;
			//});
			Api.getSentencePosts(inSelection.id);
			Api.getPost(inSelection.id);
			console.log("Selected a sentence.");
		}
	};
});

