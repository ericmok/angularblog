var app = angular.module("app", ['ModelRepresentations']);

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
	};
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
			console.log("get urlcache:", urlCache);
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
			console.log("getURL:", url);
			var cache = ModelCache.getURL(url);
			if (cache === null) {
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
	};
}]);

app.factory('Api', ["$http", "$q", "ModelCacheAjax", function($http, $q, ModelCacheAjax) {

	return {
		main: null,
		sidebar: {},
		getPost: function(id) {
			console.log("getPost id:", id);
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
					
					var url = "/blog/api/" + model.parent_content_type + "s/" + model.parent_id;
					console.log("fetching url>", url);

					return ModelCacheAjax.getURL(url);
				}
			}


			console.log("get parent of post, not a post model");
			// This model is not a post, return a reject
			var deferred = $q.defer();
			deferred.reject(null);
			return deferred.promise;
		
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
			Api.getPost(inSelection.id);
			console.log("Selected a sentence.");
		}
	};
});

app.controller("AppController", ["$rootScope", "$scope", "$http", "$location", "Api", function($rootScope, $scope, $http, $location, Api) {
	$scope.model = {
		post: {},
		sidePanel: {} // Represents the right panel (in the future, multiple panels)
	};

	$scope.updateSidePanelWithGivenNewSentence = function(sentence) {
		if (sentence.number_replies > 0) {
			console.log("There are replies. Fetching Comments for that sentence.");
			Api.getSentenceComments(sentence.id).then(function(json) {
				$scope.model.sidePanel = json;
			});
		}
		else {
			console.log("There are no replies for that sentence.");
			$scope.model.sidePanel = {
			};
		}
	};

	$scope.$on("viewSentence", function(ev, obj) {
		console.log("Triggering system worked!");
		console.log(obj);
		// Type problem
		if (parseInt(obj.sidebar) === 0) {
			console.log("updating sidepanel");
			$scope.updateSidePanelWithGivenNewSentence(obj.sentence);
		}
		console.log("Broadcast");
		// untrigger selected sentences
		$scope.$broadcast("SENTENCE_SELECTED", {
			sentence: obj.sentence, // pass in colors?
			sidebar: obj.sidebar
		});
	});

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
				sidePanel = json;
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



app.directive("postParent", function($compile, Api) {
	var blogTemplate = angular.element("<div><h4>{{parent_model.text}}</h4>{{parent_model}}</div>");

	return {
		restrict: "EA",
		scope: {
			model: "="
		},
		template: "<div><div class='alert alert-success' ng-bind='parent_model.text'></div></div>",
		replace: true,
		controller: function($scope) {

			$scope.updateParentModel = function() {
				return Api.getParentOfPost($scope.model).then(function(json) {
					$scope.parent_model = json;
				});
			};

			// $scope.$on('COMMENTS_CHANGING', function(ev, data) {
			// 	console.log("update");
			// 	$scope.updateParentModel();
			// });

			$scope.updateParentModel();

			$scope.$watch('model', function(newVal) {
				console.log("model changed");
				$scope.updateParentModel().then(function(json) {
					Api.getParentOfPost($scope.model).then(function(json) {
						$scope.parent_model = json;
						//element.html( Math.random() ); //$compile(blogTemplate)($scope)
						console.log("parent_model:", $scope.parent_model.text);
					});
				});
			});
		},
		link: function(scope, element, attrs) {
		}
	};
});

app.directive("commentsPanel", function($compile, Api) {
	var rootElement = angular.element("<div class='comment-panel panel panel-primary' ng-repeat='c in comments.results'></div>");
	//var postParentElement = angular.element("<post-parent model='c'></post-parent>");
	var titleElement = angular.element("<div class='panel-heading'><h4 class='panel-title comment-title' ng-bind='c.title'></h4></div>");

	var bodyElement = angular.element("<div class='panel-body'></div>");
	var paragraphElements = angular.element("<p class='comment-paragraph' ng-repeat='p in c.content.paragraphs'></p>");
	var sentenceElements = angular.element("<span sentence='s' class='comment-sentence' sidebar='{{getSidebarPosition()}}' ng-repeat='s in p.sentences'></span>");

	return {
		restrict: "EA",
		//template: "<div></div>",
		templateUrl: "/static/blog/dist/tpl/comment.tpl.html",
		replace: true,
		scope: {
			comments: "=",
			sidebar: "@"
		},
		controller: function($scope) {
			$scope.comments = {};

			$scope.getSidebarPosition = function() {
				return parseInt($scope.sidebar);
			}

			// $scope.$watch('comments', function(newVal){
			// 	$scope.$broadcast('COMMENTS_CHANGING', newVal);
			// });
		},
		link: function(scope, element, attrs) {
			console.log("Comments panel:", scope.comments);

			// paragraphElements.append(sentenceElements);

			// bodyElement.append(paragraphElements);

			// rootElement.append(titleElement);
			// rootElement.append(bodyElement);

			// element.html( $compile(rootElement)(scope) );

			// scope.$watch('comments', function(newVal){
			// 	console.log("Comments changed");
			// 	//element.html( $compile(rootElement.contents())(scope) );
			// });
		}
	};
});

app.directive("sentence", ["$timeout", "$parse", "Api", function($timeout, $parse, Api) {

	return {
		restrict: "A",
		template: "<span ng-class='{\"sentence-selected\":isSelected}'>{{sentence.text}}<span ng-show='{{sentence.number_replies > 0}}' class='badge'>{{sentence.number_replies}}</span></span>",
		replace: true,
		scope: {
			sentence: "=",
			sidebar: "@"
		},
		controller: function($scope) {
			$scope.isSelected = false;
			$scope.mouseOvered = false;

			// Trigger comments panel or other things to react
			$scope.emitViewSentence = function(obj) {
				$scope.$emit("viewSentence", obj);
				$scope.isSelected = true;
			};

			$scope.$on("SENTENCE_SELECTED", function(ev, obj) {
				if (obj.sidebar != $scope.sidebar) {
					return;
				}
				
				// Unselect itself if it is not the sentence that emitted the event chain
				if (obj.sentence.id != $scope.sentence.id) {
					console.log("unselected");
					$scope.isSelected = false;
					$scope.$digest();
				}
			});
		},
		link: function(scope, element, attrs) {

			var self = this;

			scope.timer = null;

			//console.log("Link:", scope.sentence);
			//console.log("Link Sidebar:", scope.sidebar);

			if (scope.sentence.number_replies > 0) {
				element.css({
					//fontWeight: "bold"
				});
			}

			element.on("mouseover", function(ev) {
				scope.timer = $timeout(function() {
					
					scope.emitViewSentence({
						sentence: scope.sentence,
						sidebar: scope.sidebar
					});

					scope.timer = null;
					// digested automatically by timeout
				}, 400);
				scope.$digest();

				scope.mouseOvered = true;
				element.addClass('sentence-highlight');

			}).on("mouseout", function(ev) {
				$timeout.cancel(scope.timer);
				scope.timer = null;
				scope.$digest();

				scope.mouseOvered = false;
				element.removeClass('sentence-highlight');
			});
		}
	};
}]);



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
			};

			this.goNext = $scope.goNext;

			this.addPostSlide = function(element) {
				$scope.postSlides.push(element);
				return $scope.postSlides.length - 1;
			};

			this.isCurrentSlide = function(index) {
				return $scope.currentSlide == index;
			};

			this.isSidebar = function(index) {
				return ($scope.currentSlide + 1) == index;
			};

			this.getCurrentSlide = function() {
				return $scope.currentSlide;
			};

			this.getPostSlides = function() {
				return $scope.postSlides;
			};
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
	};
});

