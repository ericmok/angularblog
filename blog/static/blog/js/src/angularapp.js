var app = angular.module("app", []);

app.config(function($locationProvider) {
	$locationProvider.html5Mode(true).hashPrefix("#");
});


app.run(function($rootScope, $location) {
	$rootScope.$on('$locationChangeSuccess', function() {
		$rootScope.backLocation = $location.hash();
	});
});

app.service('SidebarObject', function() {
	return function() {
		this.posts = [];
	}
});

app.factory("ModelCache", function() {
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
			for (var i = 0; i < urlCache.length; i++) {
				if (urlCache[i].url == url) {
					return urlCache[i].value;
				}
			}
			return null;
		}
	};

});

app.factory('ModelCacheAjax', ["$http", "$q", "ModelCache", function($http, $q, ModelCache) {
	return {
		getURL: function(url) {
			var cache = ModelCache.getURL(url);
			if (cache == null) {
				return $http.get(url).then(function(json) {
					ModelCache.setURL(url, json.data);
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
	}
}])

app.factory('Api', ["$http", "$q", "ModelCacheAjax", function($http, $q, ModelCacheAjax) {

	return {
		main: null,
		sidebar: {},
		getPost: function(id) {
			return ModelCacheAjax.getURL("/blog/api/posts/" + id);
		},
		getSentencePosts: function(id) {
			return ModelCacheAjax.getURL("/blog/api/sentences/" + id + "/comments");
		},
		getSentenceComments: function(sentenceId) {
			return ModelCacheAjax.getURL("/blog/api/sentences/" + sentenceId + "/comments");
		},
		getParentOfPost: function(model) {
			console.log("get parent of post:");
			console.log(model);
			if (model.content_type == "post") {
				console.log("get parent of post is post test pasts");
				if (model.parent_content_type == "blog" || 
					model.parent_content_type == "post" ||
					model.parent_content_type == "sentence") {
					console.log("get parent of post valid parent_ct");
					return ModelCacheAjax.getURL("/blog/api/" + model.parent_content_type + "s/" + model.id);
				}
			}
			else {
				console.log("get parent of post, not a post model");
				// This model is not a post, return a reject
				var deferred = $q.defer();
				deferred.reject(null);
				return deferred;
			}
		}
	};
}]);



app.factory('SentenceSelection', function(Api) {
	var selection = null;
	return {
		setSelection: function(inSelection) {
			selection = inSelection;
			//Api.getSentenceComments(inSelection.id).then(function(json) {
			//	Api.sidebar = json;
			//});
			Api.getSentencePosts(inSelection.id);
			Api.getPost(inSelection.id)
			console.log("Selected a sentence.");
		}
	};
});

app.controller("AppController", ["$rootScope", "$scope", "$http", "$location", "Api", function($rootScope, $scope, $http, $location, Api) {
	$scope.model = {
		post: {},
		sidebar: {}
	};
		
	$scope.updateSidebar = function(value) {
		$scope.model.sidebar = value;
	}

	$scope.$watch(function() {
			return $location.hash();
		}, function(newVal) {
			// Tests on new URL
			$scope.$location = newVal;
			console.log("Watch location");
			Api.getPost($location.hash()).then(function(json) {
				$scope.model.post = json;
				// Api.getParentOfPost(json).then(function(json) {
				// 	$scope.model.parent = json;
				// 	console.log("Parent", $scope.model.parent);
				// });
			
			});
			Api.getSentenceComments($location.hash()).then(function(json) {
				$scope.model.sidebar = json;
			});
		}
	);
}]);

app.directive("mainPost", function() { 
	return {
		restrict: "EA",
		scope: {
			post: "=post"
		},
		link: function(scope, element, attrs) {

		}
	};
});

app.directive("sentence", ["$timeout", "$parse", "Api", function($timeout, $parse, Api) {

	return {
		restrict: "A",
		template: "<span ng-bind='sentence.text'></span>",
		replace: true,
		scope: {
			sentence: "=",
			sidebar: "="
		},

		link: function(scope, element, attrs) {

			var self = this;

			scope.timer = null;

			console.log("Link:", scope.sentence);
			console.log("Link Sidebar:", scope.sidebar);

			element.on("mouseover", function(ev) {
				scope.timer = $timeout(function() {
					console.log("TIME!");
					console.log(scope);	
					
					Api.getSentencePosts(scope.sentence.id).then(function(json) {
						scope.sidebar = json;
					});

					scope.timer = null;
					scope.$digest();
					// digested automatically by timeout
				}, 400);
				scope.$digest();

				element.css({
					backgroundColor: "#F8E456"
				});
			}).on("mouseout", function(ev) {
				$timeout.cancel(scope.timer);
				scope.timer = null;
				scope.$digest();

				element.css({
					backgroundColor: "#FFF"
				});
			});
		}
	}
}]);

app.directive("bPostParent", function() {
	return { 
		controller: function($scope, Api) {

		}
	}
})

app.directive("postParent", function($compile, Api) {
	 var title = angular.element("<span class='parent-title'>{{model.parent.id}}</span>");

	return {
		restrict: "EA",
		scope: {
			post: "=post"
		},
		template: "<span class='parent'></span>",
		replace: true,
		controller: function($scope) {
			$scope.model = {}; // Child scope so we don't overwrite parent
			$scope.model.parent = {title:"controller set"};

			$scope.loadParent = function(model) {
				console.log("Load parent");
				Api.getParentOfPost(model).then(function(json) {
					console.log("parent result",  json);
					$scope.model.parent = json;
					console.log("parent text[", $scope.model.parent.id + "]");
				});
			}
		},
		link: function(scope, element, attrs) {

			console.log("postParent link");

			var self = this;

			element.html( $compile(title)(scope) );			
		
			//scope.$watch('post', function(newVal) {
			// 	console.log("New val:", newVal);
			// 	console.log("New val id:", newVal.id);
			// 	if (newVal !== undefined) {
			// 		scope.loadParent(newVal);

			// 		console.log("load parent return: [", scope.model.parent.id)
			// 		element.html( $compile(temp)(scope) );
			// 		// element.html( "CHANGED" );
			// 	}
			// });


		}
	};
});

app.controller("sidebar", ["$scope", "$http", "Api", "$location", function($scope, $http, Api, $location) {
	$scope.comments = ['a','b'];
}]);

app.directive("postSlider", function($location) {
	return {
		restrict: "EA",
		template: "<div><div ng-transclude style='width:1000px'></div></div>",
		transclude: true,
		controller: function($scope, $location) {

			$scope.currentSlide = 0;
			$scope.postSlides = [];

			$scope.goNext = function(triggeringIndex) {
				if (triggeringIndex == $scope.currentSlide + 1) {
					var expired = $scope.postSlides[$scope.currentSlide];
					expired.css({
						marginLeft: "-50%",
					});
					$scope.currentSlide++;
					$location.hash($scope.currentSlide);
					$scope.$apply();
					console.log("Loc:",$location.hash());
				}
			}

			this.goNext = $scope.goNext;

			this.addPostSlide = function(element) {
				$scope.postSlides.push(element);
				return $scope.postSlides.length - 1;
			}

			this.isCurrentSlide = function(index) {
				return $scope.currentSlide == index;
			}

			this.isSidebar = function(index) {
				return ($scope.currentSlide + 1) == index;
			}

			this.getCurrentSlide = function() {
				return $scope.currentSlide;
			}

			this.getPostSlides = function() {
				return $scope.postSlides;
			}
		},
		link: function(scope, element, attrs) {

		}
	};
});



app.directive("postSlide", function() {
	return {
		restrict: "EA",
		require: "^postSlider",
		scope: {

		},
		controller: function($scope) {
			$scope.index = 0;
			this.getIndex = function() {
				return $scope.index;
			}
		},
		link: function(scope, element, attrs, sliderCtrl) {
			scope.index = sliderCtrl.addPostSlide(element);

			element.css({
				border: "solid 1px #BBB",
				float: "left",
				width: "100px",
				transition: "all 0.7s ease"
			});	

			element.on("mouseover", function(ev) {
				element.css({backgroundColor: "#DDD"});
			})
			.on("mouseout", function(ev) {
				element.css({backgroundColor: "#FFF"});
			})
			.on("click", function(ev) {
				console.log("Clicked the index:", scope.index);
				sliderCtrl.goNext(scope.index);
			});
		}
	}
});

