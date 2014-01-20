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
		sidePanel: {} // Represents the right panel (in the future, multiple panels)
	};

	$scope.updateSidePanelWithGivenNewSentence = function(sentence) {
		if (sentence.number_replies > 0) {
			Api.getSentenceComments(sentence.id).then(function(json) {
				$scope.model.sidePanel = json;
			});
		}
		else {
			$scope.model.sidePanel = {
			};
		}
	}

	$scope.$on("viewSentence", function(ev, obj) {
		console.log("Triggering system worked!");
		console.log(obj);
		if (obj.sidebar == 0) {
			$scope.updateSidePanelWithGivenNewSentence(obj.sentence);
		}
		
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
		},
		link: function(scope, element, attrs) {
			scope.$watch('model', function(newVal) {
				console.log("model changed");
				scope.updateParentModel().then(function(json) {
					Api.getParentOfPost(scope.model).then(function(json) {
						scope.parent_model = json;
						//element.html( Math.random() ); //$compile(blogTemplate)(scope)
						console.log("parent_model:", scope.parent_model.text);
					});
				});

			});
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
		template: "<div></div>",
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

			paragraphElements.append(sentenceElements);

			bodyElement.append(paragraphElements);

			//rootElement.append(postParentElement);
			rootElement.append(titleElement);
			rootElement.append(bodyElement);

			element.html( $compile(rootElement)(scope) );

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
		template: "<span ng-class='{\"sentence-selected\":isSelected}'>{{sentence.text}}</span>",
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
			}

			$scope.$on("SENTENCE_SELECTED", function(ev, obj) {
				if (obj.sidebar != $scope.sidebar) {
					return;
				}
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
	}
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



'use strict';
/* jshint maxlen: false */

/**
 * @ngdoc overview
 * @name ngAnimate
 * @description
 *
 * # ngAnimate
 *
 * The `ngAnimate` module provides support for JavaScript, CSS3 transition and CSS3 keyframe animation hooks within existing core and custom directives.
 *
 * {@installModule animate}
 *
 * <div doc-module-components="ngAnimate"></div>
 *
 * # Usage
 *
 * To see animations in action, all that is required is to define the appropriate CSS classes
 * or to register a JavaScript animation via the myModule.animation() function. The directives that support animation automatically are:
 * `ngRepeat`, `ngInclude`, `ngIf`, `ngSwitch`, `ngShow`, `ngHide`, `ngView` and `ngClass`. Custom directives can take advantage of animation
 * by using the `$animate` service.
 *
 * Below is a more detailed breakdown of the supported animation events provided by pre-existing ng directives:
 *
 * | Directive                                                 | Supported Animations                               |
 * |---------------------------------------------------------- |----------------------------------------------------|
 * | {@link ng.directive:ngRepeat#usage_animations ngRepeat}         | enter, leave and move                              |
 * | {@link ngRoute.directive:ngView#usage_animations ngView}        | enter and leave                                    |
 * | {@link ng.directive:ngInclude#usage_animations ngInclude}       | enter and leave                                    |
 * | {@link ng.directive:ngSwitch#usage_animations ngSwitch}         | enter and leave                                    |
 * | {@link ng.directive:ngIf#usage_animations ngIf}                 | enter and leave                                    |
 * | {@link ng.directive:ngClass#usage_animations ngClass}           | add and remove                                     |
 * | {@link ng.directive:ngShow#usage_animations ngShow & ngHide}    | add and remove (the ng-hide class value)           |
 *
 * You can find out more information about animations upon visiting each directive page.
 *
 * Below is an example of how to apply animations to a directive that supports animation hooks:
 *
 * <pre>
 * <style type="text/css">
 * .slide.ng-enter, .slide.ng-leave {
 *   -webkit-transition:0.5s linear all;
 *   transition:0.5s linear all;
 * }
 *
 * .slide.ng-enter { }        /&#42; starting animations for enter &#42;/
 * .slide.ng-enter-active { } /&#42; terminal animations for enter &#42;/
 * .slide.ng-leave { }        /&#42; starting animations for leave &#42;/
 * .slide.ng-leave-active { } /&#42; terminal animations for leave &#42;/
 * </style>
 *
 * <!--
 * the animate service will automatically add .ng-enter and .ng-leave to the element
 * to trigger the CSS transition/animations
 * -->
 * <ANY class="slide" ng-include="..."></ANY>
 * </pre>
 *
 * Keep in mind that if an animation is running, any child elements cannot be animated until the parent element's
 * animation has completed.
 *
 * <h2>CSS-defined Animations</h2>
 * The animate service will automatically apply two CSS classes to the animated element and these two CSS classes
 * are designed to contain the start and end CSS styling. Both CSS transitions and keyframe animations are supported
 * and can be used to play along with this naming structure.
 *
 * The following code below demonstrates how to perform animations using **CSS transitions** with Angular:
 *
 * <pre>
 * <style type="text/css">
 * /&#42;
 *  The animate class is apart of the element and the ng-enter class
 *  is attached to the element once the enter animation event is triggered
 * &#42;/
 * .reveal-animation.ng-enter {
 *  -webkit-transition: 1s linear all; /&#42; Safari/Chrome &#42;/
 *  transition: 1s linear all; /&#42; All other modern browsers and IE10+ &#42;/
 *
 *  /&#42; The animation preparation code &#42;/
 *  opacity: 0;
 * }
 *
 * /&#42;
 *  Keep in mind that you want to combine both CSS
 *  classes together to avoid any CSS-specificity
 *  conflicts
 * &#42;/
 * .reveal-animation.ng-enter.ng-enter-active {
 *  /&#42; The animation code itself &#42;/
 *  opacity: 1;
 * }
 * </style>
 *
 * <div class="view-container">
 *   <div ng-view class="reveal-animation"></div>
 * </div>
 * </pre>
 *
 * The following code below demonstrates how to perform animations using **CSS animations** with Angular:
 *
 * <pre>
 * <style type="text/css">
 * .reveal-animation.ng-enter {
 *   -webkit-animation: enter_sequence 1s linear; /&#42; Safari/Chrome &#42;/
 *   animation: enter_sequence 1s linear; /&#42; IE10+ and Future Browsers &#42;/
 * }
 * &#64-webkit-keyframes enter_sequence {
 *   from { opacity:0; }
 *   to { opacity:1; }
 * }
 * &#64keyframes enter_sequence {
 *   from { opacity:0; }
 *   to { opacity:1; }
 * }
 * </style>
 *
 * <div class="view-container">
 *   <div ng-view class="reveal-animation"></div>
 * </div>
 * </pre>
 *
 * Both CSS3 animations and transitions can be used together and the animate service will figure out the correct duration and delay timing.
 *
 * Upon DOM mutation, the event class is added first (something like `ng-enter`), then the browser prepares itself to add
 * the active class (in this case `ng-enter-active`) which then triggers the animation. The animation module will automatically
 * detect the CSS code to determine when the animation ends. Once the animation is over then both CSS classes will be
 * removed from the DOM. If a browser does not support CSS transitions or CSS animations then the animation will start and end
 * immediately resulting in a DOM element that is at its final state. This final state is when the DOM element
 * has no CSS transition/animation classes applied to it.
 *
 * <h3>CSS Staggering Animations</h3>
 * A Staggering animation is a collection of animations that are issued with a slight delay in between each successive operation resulting in a
 * curtain-like effect. The ngAnimate module, as of 1.2.0, supports staggering animations and the stagger effect can be
 * performed by creating a **ng-EVENT-stagger** CSS class and attaching that class to the base CSS class used for
 * the animation. The style property expected within the stagger class can either be a **transition-delay** or an
 * **animation-delay** property (or both if your animation contains both transitions and keyframe animations).
 *
 * <pre>
 * .my-animation.ng-enter {
 *   /&#42; standard transition code &#42;/
 *   -webkit-transition: 1s linear all;
 *   transition: 1s linear all;
 *   opacity:0;
 * }
 * .my-animation.ng-enter-stagger {
 *   /&#42; this will have a 100ms delay between each successive leave animation &#42;/
 *   -webkit-transition-delay: 0.1s;
 *   transition-delay: 0.1s;
 *
 *   /&#42; in case the stagger doesn't work then these two values
 *    must be set to 0 to avoid an accidental CSS inheritance &#42;/
 *   -webkit-transition-duration: 0s;
 *   transition-duration: 0s;
 * }
 * .my-animation.ng-enter.ng-enter-active {
 *   /&#42; standard transition styles &#42;/
 *   opacity:1;
 * }
 * </pre>
 *
 * Staggering animations work by default in ngRepeat (so long as the CSS class is defined). Outside of ngRepeat, to use staggering animations
 * on your own, they can be triggered by firing multiple calls to the same event on $animate. However, the restrictions surrounding this
 * are that each of the elements must have the same CSS className value as well as the same parent element. A stagger operation
 * will also be reset if more than 10ms has passed after the last animation has been fired.
 *
 * The following code will issue the **ng-leave-stagger** event on the element provided:
 *
 * <pre>
 * var kids = parent.children();
 *
 * $animate.leave(kids[0]); //stagger index=0
 * $animate.leave(kids[1]); //stagger index=1
 * $animate.leave(kids[2]); //stagger index=2
 * $animate.leave(kids[3]); //stagger index=3
 * $animate.leave(kids[4]); //stagger index=4
 *
 * $timeout(function() {
 *   //stagger has reset itself
 *   $animate.leave(kids[5]); //stagger index=0
 *   $animate.leave(kids[6]); //stagger index=1
 * }, 100, false);
 * </pre>
 *
 * Stagger animations are currently only supported within CSS-defined animations.
 *
 * <h2>JavaScript-defined Animations</h2>
 * In the event that you do not want to use CSS3 transitions or CSS3 animations or if you wish to offer animations on browsers that do not
 * yet support CSS transitions/animations, then you can make use of JavaScript animations defined inside of your AngularJS module.
 *
 * <pre>
 * //!annotate="YourApp" Your AngularJS Module|Replace this or ngModule with the module that you used to define your application.
 * var ngModule = angular.module('YourApp', ['ngAnimate']);
 * ngModule.animation('.my-crazy-animation', function() {
 *   return {
 *     enter: function(element, done) {
 *       //run the animation here and call done when the animation is complete
 *       return function(cancelled) {
 *         //this (optional) function will be called when the animation
 *         //completes or when the animation is cancelled (the cancelled
 *         //flag will be set to true if cancelled).
 *       };
 *     },
 *     leave: function(element, done) { },
 *     move: function(element, done) { },
 *
 *     //animation that can be triggered before the class is added
 *     beforeAddClass: function(element, className, done) { },
 *
 *     //animation that can be triggered after the class is added
 *     addClass: function(element, className, done) { },
 *
 *     //animation that can be triggered before the class is removed
 *     beforeRemoveClass: function(element, className, done) { },
 *
 *     //animation that can be triggered after the class is removed
 *     removeClass: function(element, className, done) { }
 *   };
 * });
 * </pre>
 *
 * JavaScript-defined animations are created with a CSS-like class selector and a collection of events which are set to run
 * a javascript callback function. When an animation is triggered, $animate will look for a matching animation which fits
 * the element's CSS class attribute value and then run the matching animation event function (if found).
 * In other words, if the CSS classes present on the animated element match any of the JavaScript animations then the callback function will
 * be executed. It should be also noted that only simple, single class selectors are allowed (compound class selectors are not supported).
 *
 * Within a JavaScript animation, an object containing various event callback animation functions is expected to be returned.
 * As explained above, these callbacks are triggered based on the animation event. Therefore if an enter animation is run,
 * and the JavaScript animation is found, then the enter callback will handle that animation (in addition to the CSS keyframe animation
 * or transition code that is defined via a stylesheet).
 *
 */

angular.module('ngAnimate', ['ng'])

  /**
   * @ngdoc object
   * @name ngAnimate.$animateProvider
   * @description
   *
   * The `$animateProvider` allows developers to register JavaScript animation event handlers directly inside of a module.
   * When an animation is triggered, the $animate service will query the $animate service to find any animations that match
   * the provided name value.
   *
   * Requires the {@link ngAnimate `ngAnimate`} module to be installed.
   *
   * Please visit the {@link ngAnimate `ngAnimate`} module overview page learn more about how to use animations in your application.
   *
   */
  .factory('$$animateReflow', ['$window', '$timeout', function($window, $timeout) {
    var requestAnimationFrame = $window.requestAnimationFrame       ||
                                $window.mozRequestAnimationFrame    ||
                                $window.webkitRequestAnimationFrame ||
                                function(fn) {
                                  return $timeout(fn, 10, false);
                                };

    var cancelAnimationFrame = $window.cancelAnimationFrame       ||
                               $window.mozCancelAnimationFrame    ||
                               $window.webkitCancelAnimationFrame ||
                               function(timer) {
                                 return $timeout.cancel(timer);
                               };
    return function(fn) {
      var id = requestAnimationFrame(fn);
      return function() {
        cancelAnimationFrame(id);
      };
    };
  }])

  .config(['$provide', '$animateProvider', function($provide, $animateProvider) {
    var noop = angular.noop;
    var forEach = angular.forEach;
    var selectors = $animateProvider.$$selectors;

    var ELEMENT_NODE = 1;
    var NG_ANIMATE_STATE = '$$ngAnimateState';
    var NG_ANIMATE_CLASS_NAME = 'ng-animate';
    var rootAnimateState = {running: true};

    function extractElementNode(element) {
      for(var i = 0; i < element.length; i++) {
        var elm = element[i];
        if(elm.nodeType == ELEMENT_NODE) {
          return elm;
        }
      }
    }

    function isMatchingElement(elm1, elm2) {
      return extractElementNode(elm1) == extractElementNode(elm2);
    }

    $provide.decorator('$animate', ['$delegate', '$injector', '$sniffer', '$rootElement', '$timeout', '$rootScope', '$document',
                            function($delegate,   $injector,   $sniffer,   $rootElement,   $timeout,   $rootScope,   $document) {

      $rootElement.data(NG_ANIMATE_STATE, rootAnimateState);

      // disable animations during bootstrap, but once we bootstrapped, wait again
      // for another digest until enabling animations. The reason why we digest twice
      // is because all structural animations (enter, leave and move) all perform a
      // post digest operation before animating. If we only wait for a single digest
      // to pass then the structural animation would render its animation on page load.
      // (which is what we're trying to avoid when the application first boots up.)
      $rootScope.$$postDigest(function() {
        $rootScope.$$postDigest(function() {
          rootAnimateState.running = false;
        });
      });

      var classNameFilter = $animateProvider.classNameFilter();
      var isAnimatableClassName = !classNameFilter
              ? function() { return true; }
              : function(className) {
                return classNameFilter.test(className);
              };

      function async(fn) {
        return $timeout(fn, 0, false);
      }

      function lookup(name) {
        if (name) {
          var matches = [],
              flagMap = {},
              classes = name.substr(1).split('.');

          //the empty string value is the default animation
          //operation which performs CSS transition and keyframe
          //animations sniffing. This is always included for each
          //element animation procedure if the browser supports
          //transitions and/or keyframe animations
          if ($sniffer.transitions || $sniffer.animations) {
            classes.push('');
          }

          for(var i=0; i < classes.length; i++) {
            var klass = classes[i],
                selectorFactoryName = selectors[klass];
            if(selectorFactoryName && !flagMap[klass]) {
              matches.push($injector.get(selectorFactoryName));
              flagMap[klass] = true;
            }
          }
          return matches;
        }
      }

      /**
       * @ngdoc object
       * @name ngAnimate.$animate
       * @function
       *
       * @description
       * The `$animate` service provides animation detection support while performing DOM operations (enter, leave and move) as well as during addClass and removeClass operations.
       * When any of these operations are run, the $animate service
       * will examine any JavaScript-defined animations (which are defined by using the $animateProvider provider object)
       * as well as any CSS-defined animations against the CSS classes present on the element once the DOM operation is run.
       *
       * The `$animate` service is used behind the scenes with pre-existing directives and animation with these directives
       * will work out of the box without any extra configuration.
       *
       * Requires the {@link ngAnimate `ngAnimate`} module to be installed.
       *
       * Please visit the {@link ngAnimate `ngAnimate`} module overview page learn more about how to use animations in your application.
       *
       */
      return {
        /**
         * @ngdoc function
         * @name ngAnimate.$animate#enter
         * @methodOf ngAnimate.$animate
         * @function
         *
         * @description
         * Appends the element to the parentElement element that resides in the document and then runs the enter animation. Once
         * the animation is started, the following CSS classes will be present on the element for the duration of the animation:
         *
         * Below is a breakdown of each step that occurs during enter animation:
         *
         * | Animation Step                                                                               | What the element class attribute looks like |
         * |----------------------------------------------------------------------------------------------|---------------------------------------------|
         * | 1. $animate.enter(...) is called                                                             | class="my-animation"                        |
         * | 2. element is inserted into the parentElement element or beside the afterElement element     | class="my-animation"                        |
         * | 3. $animate runs any JavaScript-defined animations on the element                            | class="my-animation ng-animate"             |
         * | 4. the .ng-enter class is added to the element                                               | class="my-animation ng-animate ng-enter"    |
         * | 5. $animate scans the element styles to get the CSS transition/animation duration and delay  | class="my-animation ng-animate ng-enter"    |
         * | 6. $animate waits for 10ms (this performs a reflow)                                          | class="my-animation ng-animate ng-enter"    |
         * | 7. the .ng-enter-active and .ng-animate-active classes are added (this triggers the CSS transition/animation) | class="my-animation ng-animate ng-animate-active ng-enter ng-enter-active" |
         * | 8. $animate waits for X milliseconds for the animation to complete                           | class="my-animation ng-animate ng-animate-active ng-enter ng-enter-active" |
         * | 9. The animation ends and all generated CSS classes are removed from the element             | class="my-animation"                        |
         * | 10. The doneCallback() callback is fired (if provided)                                       | class="my-animation"                        |
         *
         * @param {jQuery/jqLite element} element the element that will be the focus of the enter animation
         * @param {jQuery/jqLite element} parentElement the parent element of the element that will be the focus of the enter animation
         * @param {jQuery/jqLite element} afterElement the sibling element (which is the previous element) of the element that will be the focus of the enter animation
         * @param {function()=} doneCallback the callback function that will be called once the animation is complete
        */
        enter : function(element, parentElement, afterElement, doneCallback) {
          this.enabled(false, element);
          $delegate.enter(element, parentElement, afterElement);
          $rootScope.$$postDigest(function() {
            performAnimation('enter', 'ng-enter', element, parentElement, afterElement, noop, doneCallback);
          });
        },

        /**
         * @ngdoc function
         * @name ngAnimate.$animate#leave
         * @methodOf ngAnimate.$animate
         * @function
         *
         * @description
         * Runs the leave animation operation and, upon completion, removes the element from the DOM. Once
         * the animation is started, the following CSS classes will be added for the duration of the animation:
         *
         * Below is a breakdown of each step that occurs during leave animation:
         *
         * | Animation Step                                                                               | What the element class attribute looks like |
         * |----------------------------------------------------------------------------------------------|---------------------------------------------|
         * | 1. $animate.leave(...) is called                                                             | class="my-animation"                        |
         * | 2. $animate runs any JavaScript-defined animations on the element                            | class="my-animation ng-animate"             |
         * | 3. the .ng-leave class is added to the element                                               | class="my-animation ng-animate ng-leave"    |
         * | 4. $animate scans the element styles to get the CSS transition/animation duration and delay  | class="my-animation ng-animate ng-leave"    |
         * | 5. $animate waits for 10ms (this performs a reflow)                                          | class="my-animation ng-animate ng-leave"    |
         * | 6. the .ng-leave-active and .ng-animate-active classes is added (this triggers the CSS transition/animation) | class="my-animation ng-animate ng-animate-active ng-leave ng-leave-active" |
         * | 7. $animate waits for X milliseconds for the animation to complete                           | class="my-animation ng-animate ng-animate-active ng-leave ng-leave-active" |
         * | 8. The animation ends and all generated CSS classes are removed from the element             | class="my-animation"                        |
         * | 9. The element is removed from the DOM                                                       | ...                                         |
         * | 10. The doneCallback() callback is fired (if provided)                                       | ...                                         |
         *
         * @param {jQuery/jqLite element} element the element that will be the focus of the leave animation
         * @param {function()=} doneCallback the callback function that will be called once the animation is complete
        */
        leave : function(element, doneCallback) {
          cancelChildAnimations(element);
          this.enabled(false, element);
          $rootScope.$$postDigest(function() {
            performAnimation('leave', 'ng-leave', element, null, null, function() {
              $delegate.leave(element);
            }, doneCallback);
          });
        },

        /**
         * @ngdoc function
         * @name ngAnimate.$animate#move
         * @methodOf ngAnimate.$animate
         * @function
         *
         * @description
         * Fires the move DOM operation. Just before the animation starts, the animate service will either append it into the parentElement container or
         * add the element directly after the afterElement element if present. Then the move animation will be run. Once
         * the animation is started, the following CSS classes will be added for the duration of the animation:
         *
         * Below is a breakdown of each step that occurs during move animation:
         *
         * | Animation Step                                                                               | What the element class attribute looks like |
         * |----------------------------------------------------------------------------------------------|---------------------------------------------|
         * | 1. $animate.move(...) is called                                                              | class="my-animation"                        |
         * | 2. element is moved into the parentElement element or beside the afterElement element        | class="my-animation"                        |
         * | 3. $animate runs any JavaScript-defined animations on the element                            | class="my-animation ng-animate"             |
         * | 4. the .ng-move class is added to the element                                                | class="my-animation ng-animate ng-move"     |
         * | 5. $animate scans the element styles to get the CSS transition/animation duration and delay  | class="my-animation ng-animate ng-move"     |
         * | 6. $animate waits for 10ms (this performs a reflow)                                          | class="my-animation ng-animate ng-move"     |
         * | 7. the .ng-move-active and .ng-animate-active classes is added (this triggers the CSS transition/animation) | class="my-animation ng-animate ng-animate-active ng-move ng-move-active" |
         * | 8. $animate waits for X milliseconds for the animation to complete                           | class="my-animation ng-animate ng-animate-active ng-move ng-move-active" |
         * | 9. The animation ends and all generated CSS classes are removed from the element             | class="my-animation"                        |
         * | 10. The doneCallback() callback is fired (if provided)                                       | class="my-animation"                        |
         *
         * @param {jQuery/jqLite element} element the element that will be the focus of the move animation
         * @param {jQuery/jqLite element} parentElement the parentElement element of the element that will be the focus of the move animation
         * @param {jQuery/jqLite element} afterElement the sibling element (which is the previous element) of the element that will be the focus of the move animation
         * @param {function()=} doneCallback the callback function that will be called once the animation is complete
        */
        move : function(element, parentElement, afterElement, doneCallback) {
          cancelChildAnimations(element);
          this.enabled(false, element);
          $delegate.move(element, parentElement, afterElement);
          $rootScope.$$postDigest(function() {
            performAnimation('move', 'ng-move', element, parentElement, afterElement, noop, doneCallback);
          });
        },

        /**
         * @ngdoc function
         * @name ngAnimate.$animate#addClass
         * @methodOf ngAnimate.$animate
         *
         * @description
         * Triggers a custom animation event based off the className variable and then attaches the className value to the element as a CSS class.
         * Unlike the other animation methods, the animate service will suffix the className value with {@type -add} in order to provide
         * the animate service the setup and active CSS classes in order to trigger the animation (this will be skipped if no CSS transitions
         * or keyframes are defined on the -add or base CSS class).
         *
         * Below is a breakdown of each step that occurs during addClass animation:
         *
         * | Animation Step                                                                                 | What the element class attribute looks like |
         * |------------------------------------------------------------------------------------------------|---------------------------------------------|
         * | 1. $animate.addClass(element, 'super') is called                                               | class="my-animation"                        |
         * | 2. $animate runs any JavaScript-defined animations on the element                              | class="my-animation ng-animate"             |
         * | 3. the .super-add class are added to the element                                               | class="my-animation ng-animate super-add"   |
         * | 4. $animate scans the element styles to get the CSS transition/animation duration and delay    | class="my-animation ng-animate super-add"   |
         * | 5. $animate waits for 10ms (this performs a reflow)                                            | class="my-animation ng-animate super-add"   |
         * | 6. the .super, .super-add-active and .ng-animate-active classes are added (this triggers the CSS transition/animation) | class="my-animation ng-animate ng-animate-active super super-add super-add-active"          |
         * | 7. $animate waits for X milliseconds for the animation to complete                             | class="my-animation super-add super-add-active"  |
         * | 8. The animation ends and all generated CSS classes are removed from the element               | class="my-animation super"                  |
         * | 9. The super class is kept on the element                                                      | class="my-animation super"                  |
         * | 10. The doneCallback() callback is fired (if provided)                                         | class="my-animation super"                  |
         *
         * @param {jQuery/jqLite element} element the element that will be animated
         * @param {string} className the CSS class that will be added to the element and then animated
         * @param {function()=} doneCallback the callback function that will be called once the animation is complete
        */
        addClass : function(element, className, doneCallback) {
          performAnimation('addClass', className, element, null, null, function() {
            $delegate.addClass(element, className);
          }, doneCallback);
        },

        /**
         * @ngdoc function
         * @name ngAnimate.$animate#removeClass
         * @methodOf ngAnimate.$animate
         *
         * @description
         * Triggers a custom animation event based off the className variable and then removes the CSS class provided by the className value
         * from the element. Unlike the other animation methods, the animate service will suffix the className value with {@type -remove} in
         * order to provide the animate service the setup and active CSS classes in order to trigger the animation (this will be skipped if
         * no CSS transitions or keyframes are defined on the -remove or base CSS classes).
         *
         * Below is a breakdown of each step that occurs during removeClass animation:
         *
         * | Animation Step                                                                                | What the element class attribute looks like     |
         * |-----------------------------------------------------------------------------------------------|---------------------------------------------|
         * | 1. $animate.removeClass(element, 'super') is called                                           | class="my-animation super"                  |
         * | 2. $animate runs any JavaScript-defined animations on the element                             | class="my-animation super ng-animate"       |
         * | 3. the .super-remove class are added to the element                                           | class="my-animation super ng-animate super-remove"|
         * | 4. $animate scans the element styles to get the CSS transition/animation duration and delay   | class="my-animation super ng-animate super-remove"   |
         * | 5. $animate waits for 10ms (this performs a reflow)                                           | class="my-animation super ng-animate super-remove"   |
         * | 6. the .super-remove-active and .ng-animate-active classes are added and .super is removed (this triggers the CSS transition/animation) | class="my-animation ng-animate ng-animate-active super-remove super-remove-active"          |
         * | 7. $animate waits for X milliseconds for the animation to complete                            | class="my-animation ng-animate ng-animate-active super-remove super-remove-active"   |
         * | 8. The animation ends and all generated CSS classes are removed from the element              | class="my-animation"                        |
         * | 9. The doneCallback() callback is fired (if provided)                                         | class="my-animation"                        |
         *
         *
         * @param {jQuery/jqLite element} element the element that will be animated
         * @param {string} className the CSS class that will be animated and then removed from the element
         * @param {function()=} doneCallback the callback function that will be called once the animation is complete
        */
        removeClass : function(element, className, doneCallback) {
          performAnimation('removeClass', className, element, null, null, function() {
            $delegate.removeClass(element, className);
          }, doneCallback);
        },

        /**
         * @ngdoc function
         * @name ngAnimate.$animate#enabled
         * @methodOf ngAnimate.$animate
         * @function
         *
         * @param {boolean=} value If provided then set the animation on or off.
         * @param {jQuery/jqLite element=} element If provided then the element will be used to represent the enable/disable operation
         * @return {boolean} Current animation state.
         *
         * @description
         * Globally enables/disables animations.
         *
        */
        enabled : function(value, element) {
          switch(arguments.length) {
            case 2:
              if(value) {
                cleanup(element);
              } else {
                var data = element.data(NG_ANIMATE_STATE) || {};
                data.disabled = true;
                element.data(NG_ANIMATE_STATE, data);
              }
            break;

            case 1:
              rootAnimateState.disabled = !value;
            break;

            default:
              value = !rootAnimateState.disabled;
            break;
          }
          return !!value;
         }
      };

      /*
        all animations call this shared animation triggering function internally.
        The animationEvent variable refers to the JavaScript animation event that will be triggered
        and the className value is the name of the animation that will be applied within the
        CSS code. Element, parentElement and afterElement are provided DOM elements for the animation
        and the onComplete callback will be fired once the animation is fully complete.
      */
      function performAnimation(animationEvent, className, element, parentElement, afterElement, domOperation, doneCallback) {
        var currentClassName, classes, node = extractElementNode(element);
        if(node) {
          currentClassName = node.className;
          classes = currentClassName + ' ' + className;
        }

        //transcluded directives may sometimes fire an animation using only comment nodes
        //best to catch this early on to prevent any animation operations from occurring
        if(!node || !isAnimatableClassName(classes)) {
          fireDOMOperation();
          fireBeforeCallbackAsync();
          fireAfterCallbackAsync();
          closeAnimation();
          return;
        }

        var animationLookup = (' ' + classes).replace(/\s+/g,'.');
        if (!parentElement) {
          parentElement = afterElement ? afterElement.parent() : element.parent();
        }

        var matches = lookup(animationLookup);
        var isClassBased = animationEvent == 'addClass' || animationEvent == 'removeClass';
        var ngAnimateState = element.data(NG_ANIMATE_STATE) || {};

        //skip the animation if animations are disabled, a parent is already being animated,
        //the element is not currently attached to the document body or then completely close
        //the animation if any matching animations are not found at all.
        //NOTE: IE8 + IE9 should close properly (run closeAnimation()) in case a NO animation is not found.
        if (animationsDisabled(element, parentElement) || matches.length === 0) {
          fireDOMOperation();
          fireBeforeCallbackAsync();
          fireAfterCallbackAsync();
          closeAnimation();
          return;
        }

        var animations = [];

        //only add animations if the currently running animation is not structural
        //or if there is no animation running at all
        var allowAnimations = isClassBased ?
          !ngAnimateState.disabled && (!ngAnimateState.running || !ngAnimateState.structural) :
          true;

        if(allowAnimations) {
          forEach(matches, function(animation) {
            //add the animation to the queue to if it is allowed to be cancelled
            if(!animation.allowCancel || animation.allowCancel(element, animationEvent, className)) {
              var beforeFn, afterFn = animation[animationEvent];

              //Special case for a leave animation since there is no point in performing an
              //animation on a element node that has already been removed from the DOM
              if(animationEvent == 'leave') {
                beforeFn = afterFn;
                afterFn = null; //this must be falsy so that the animation is skipped for leave
              } else {
                beforeFn = animation['before' + animationEvent.charAt(0).toUpperCase() + animationEvent.substr(1)];
              }
              animations.push({
                before : beforeFn,
                after : afterFn
              });
            }
          });
        }

        //this would mean that an animation was not allowed so let the existing
        //animation do it's thing and close this one early
        if(animations.length === 0) {
          fireDOMOperation();
          fireBeforeCallbackAsync();
          fireAfterCallbackAsync();
          fireDoneCallbackAsync();
          return;
        }

        var ONE_SPACE = ' ';
        //this value will be searched for class-based CSS className lookup. Therefore,
        //we prefix and suffix the current className value with spaces to avoid substring
        //lookups of className tokens
        var futureClassName = ONE_SPACE + currentClassName + ONE_SPACE;
        if(ngAnimateState.running) {
          //if an animation is currently running on the element then lets take the steps
          //to cancel that animation and fire any required callbacks
          $timeout.cancel(ngAnimateState.closeAnimationTimeout);
          cleanup(element);
          cancelAnimations(ngAnimateState.animations);

          //in the event that the CSS is class is quickly added and removed back
          //then we don't want to wait until after the reflow to add/remove the CSS
          //class since both class animations may run into a race condition.
          //The code below will check to see if that is occurring and will
          //immediately remove the former class before the reflow so that the
          //animation can snap back to the original animation smoothly
          var isFullyClassBasedAnimation = isClassBased && !ngAnimateState.structural;
          var isRevertingClassAnimation = isFullyClassBasedAnimation &&
                                          ngAnimateState.className == className &&
                                          animationEvent != ngAnimateState.event;

          //if the class is removed during the reflow then it will revert the styles temporarily
          //back to the base class CSS styling causing a jump-like effect to occur. This check
          //here ensures that the domOperation is only performed after the reflow has commenced
          if(ngAnimateState.beforeComplete || isRevertingClassAnimation) {
            (ngAnimateState.done || noop)(true);
          } else if(isFullyClassBasedAnimation) {
            //class-based animations will compare element className values after cancelling the
            //previous animation to see if the element properties already contain the final CSS
            //class and if so then the animation will be skipped. Since the domOperation will
            //be performed only after the reflow is complete then our element's className value
            //will be invalid. Therefore the same string manipulation that would occur within the
            //DOM operation will be performed below so that the class comparison is valid...
            futureClassName = ngAnimateState.event == 'removeClass' ?
              futureClassName.replace(ONE_SPACE + ngAnimateState.className + ONE_SPACE, ONE_SPACE) :
              futureClassName + ngAnimateState.className + ONE_SPACE;
          }
        }

        //There is no point in perform a class-based animation if the element already contains
        //(on addClass) or doesn't contain (on removeClass) the className being animated.
        //The reason why this is being called after the previous animations are cancelled
        //is so that the CSS classes present on the element can be properly examined.
        var classNameToken = ONE_SPACE + className + ONE_SPACE;
        if((animationEvent == 'addClass'    && futureClassName.indexOf(classNameToken) >= 0) ||
           (animationEvent == 'removeClass' && futureClassName.indexOf(classNameToken) == -1)) {
          fireDOMOperation();
          fireBeforeCallbackAsync();
          fireAfterCallbackAsync();
          fireDoneCallbackAsync();
          return;
        }

        //the ng-animate class does nothing, but it's here to allow for
        //parent animations to find and cancel child animations when needed
        element.addClass(NG_ANIMATE_CLASS_NAME);

        element.data(NG_ANIMATE_STATE, {
          running:true,
          event:animationEvent,
          className:className,
          structural:!isClassBased,
          animations:animations,
          done:onBeforeAnimationsComplete
        });

        //first we run the before animations and when all of those are complete
        //then we perform the DOM operation and run the next set of animations
        invokeRegisteredAnimationFns(animations, 'before', onBeforeAnimationsComplete);

        function onBeforeAnimationsComplete(cancelled) {
          fireDOMOperation();
          if(cancelled === true) {
            closeAnimation();
            return;
          }

          //set the done function to the final done function
          //so that the DOM event won't be executed twice by accident
          //if the after animation is cancelled as well
          var data = element.data(NG_ANIMATE_STATE);
          if(data) {
            data.done = closeAnimation;
            element.data(NG_ANIMATE_STATE, data);
          }
          invokeRegisteredAnimationFns(animations, 'after', closeAnimation);
        }

        function invokeRegisteredAnimationFns(animations, phase, allAnimationFnsComplete) {
          phase == 'after' ?
            fireAfterCallbackAsync() :
            fireBeforeCallbackAsync();

          var endFnName = phase + 'End';
          forEach(animations, function(animation, index) {
            var animationPhaseCompleted = function() {
              progress(index, phase);
            };

            //there are no before functions for enter + move since the DOM
            //operations happen before the performAnimation method fires
            if(phase == 'before' && (animationEvent == 'enter' || animationEvent == 'move')) {
              animationPhaseCompleted();
              return;
            }

            if(animation[phase]) {
              animation[endFnName] = isClassBased ?
                animation[phase](element, className, animationPhaseCompleted) :
                animation[phase](element, animationPhaseCompleted);
            } else {
              animationPhaseCompleted();
            }
          });

          function progress(index, phase) {
            var phaseCompletionFlag = phase + 'Complete';
            var currentAnimation = animations[index];
            currentAnimation[phaseCompletionFlag] = true;
            (currentAnimation[endFnName] || noop)();

            for(var i=0;i<animations.length;i++) {
              if(!animations[i][phaseCompletionFlag]) return;
            }

            allAnimationFnsComplete();
          }
        }

        function fireDOMCallback(animationPhase) {
          element.triggerHandler('$animate:' + animationPhase, {
            event : animationEvent,
            className : className
          });
        }

        function fireBeforeCallbackAsync() {
          async(function() {
            fireDOMCallback('before');
          });
        }

        function fireAfterCallbackAsync() {
          async(function() {
            fireDOMCallback('after');
          });
        }

        function fireDoneCallbackAsync() {
          doneCallback && async(doneCallback);
        }

        //it is less complicated to use a flag than managing and cancelling
        //timeouts containing multiple callbacks.
        function fireDOMOperation() {
          if(!fireDOMOperation.hasBeenRun) {
            fireDOMOperation.hasBeenRun = true;
            domOperation();
          }
        }

        function closeAnimation() {
          if(!closeAnimation.hasBeenRun) {
            closeAnimation.hasBeenRun = true;
            var data = element.data(NG_ANIMATE_STATE);
            if(data) {
              /* only structural animations wait for reflow before removing an
                 animation, but class-based animations don't. An example of this
                 failing would be when a parent HTML tag has a ng-class attribute
                 causing ALL directives below to skip animations during the digest */
              if(isClassBased) {
                cleanup(element);
              } else {
                data.closeAnimationTimeout = async(function() {
                  cleanup(element);
                });
                element.data(NG_ANIMATE_STATE, data);
              }
            }
            fireDoneCallbackAsync();
          }
        }
      }

      function cancelChildAnimations(element) {
        var node = extractElementNode(element);
        forEach(node.querySelectorAll('.' + NG_ANIMATE_CLASS_NAME), function(element) {
          element = angular.element(element);
          var data = element.data(NG_ANIMATE_STATE);
          if(data) {
            cancelAnimations(data.animations);
            cleanup(element);
          }
        });
      }

      function cancelAnimations(animations) {
        var isCancelledFlag = true;
        forEach(animations, function(animation) {
          if(!animation.beforeComplete) {
            (animation.beforeEnd || noop)(isCancelledFlag);
          }
          if(!animation.afterComplete) {
            (animation.afterEnd || noop)(isCancelledFlag);
          }
        });
      }

      function cleanup(element) {
        if(isMatchingElement(element, $rootElement)) {
          if(!rootAnimateState.disabled) {
            rootAnimateState.running = false;
            rootAnimateState.structural = false;
          }
        } else {
          element.removeClass(NG_ANIMATE_CLASS_NAME);
          element.removeData(NG_ANIMATE_STATE);
        }
      }

      function animationsDisabled(element, parentElement) {
        if (rootAnimateState.disabled) return true;

        if(isMatchingElement(element, $rootElement)) {
          return rootAnimateState.disabled || rootAnimateState.running;
        }

        do {
          //the element did not reach the root element which means that it
          //is not apart of the DOM. Therefore there is no reason to do
          //any animations on it
          if(parentElement.length === 0) break;

          var isRoot = isMatchingElement(parentElement, $rootElement);
          var state = isRoot ? rootAnimateState : parentElement.data(NG_ANIMATE_STATE);
          var result = state && (!!state.disabled || !!state.running);
          if(isRoot || result) {
            return result;
          }

          if(isRoot) return true;
        }
        while(parentElement = parentElement.parent());

        return true;
      }
    }]);

    $animateProvider.register('', ['$window', '$sniffer', '$timeout', '$$animateReflow',
                           function($window,   $sniffer,   $timeout,   $$animateReflow) {
      // Detect proper transitionend/animationend event names.
      var CSS_PREFIX = '', TRANSITION_PROP, TRANSITIONEND_EVENT, ANIMATION_PROP, ANIMATIONEND_EVENT;

      // If unprefixed events are not supported but webkit-prefixed are, use the latter.
      // Otherwise, just use W3C names, browsers not supporting them at all will just ignore them.
      // Note: Chrome implements `window.onwebkitanimationend` and doesn't implement `window.onanimationend`
      // but at the same time dispatches the `animationend` event and not `webkitAnimationEnd`.
      // Register both events in case `window.onanimationend` is not supported because of that,
      // do the same for `transitionend` as Safari is likely to exhibit similar behavior.
      // Also, the only modern browser that uses vendor prefixes for transitions/keyframes is webkit
      // therefore there is no reason to test anymore for other vendor prefixes: http://caniuse.com/#search=transition
      if (window.ontransitionend === undefined && window.onwebkittransitionend !== undefined) {
        CSS_PREFIX = '-webkit-';
        TRANSITION_PROP = 'WebkitTransition';
        TRANSITIONEND_EVENT = 'webkitTransitionEnd transitionend';
      } else {
        TRANSITION_PROP = 'transition';
        TRANSITIONEND_EVENT = 'transitionend';
      }

      if (window.onanimationend === undefined && window.onwebkitanimationend !== undefined) {
        CSS_PREFIX = '-webkit-';
        ANIMATION_PROP = 'WebkitAnimation';
        ANIMATIONEND_EVENT = 'webkitAnimationEnd animationend';
      } else {
        ANIMATION_PROP = 'animation';
        ANIMATIONEND_EVENT = 'animationend';
      }

      var DURATION_KEY = 'Duration';
      var PROPERTY_KEY = 'Property';
      var DELAY_KEY = 'Delay';
      var ANIMATION_ITERATION_COUNT_KEY = 'IterationCount';
      var NG_ANIMATE_PARENT_KEY = '$$ngAnimateKey';
      var NG_ANIMATE_CSS_DATA_KEY = '$$ngAnimateCSS3Data';
      var ELAPSED_TIME_MAX_DECIMAL_PLACES = 3;
      var CLOSING_TIME_BUFFER = 1.5;
      var ONE_SECOND = 1000;

      var animationCounter = 0;
      var lookupCache = {};
      var parentCounter = 0;
      var animationReflowQueue = [];
      var animationElementQueue = [];
      var cancelAnimationReflow;
      var closingAnimationTime = 0;
      var timeOut = false;
      function afterReflow(element, callback) {
        if(cancelAnimationReflow) {
          cancelAnimationReflow();
        }

        animationReflowQueue.push(callback);

        var node = extractElementNode(element);
        element = angular.element(node);
        animationElementQueue.push(element);

        var elementData = element.data(NG_ANIMATE_CSS_DATA_KEY);

        var stagger = elementData.stagger;
        var staggerTime = elementData.itemIndex * (Math.max(stagger.animationDelay, stagger.transitionDelay) || 0);

        var animationTime = (elementData.maxDelay + elementData.maxDuration) * CLOSING_TIME_BUFFER;
        closingAnimationTime = Math.max(closingAnimationTime, (staggerTime + animationTime) * ONE_SECOND);

        //by placing a counter we can avoid an accidental
        //race condition which may close an animation when
        //a follow-up animation is midway in its animation
        elementData.animationCount = animationCounter;

        cancelAnimationReflow = $$animateReflow(function() {
          forEach(animationReflowQueue, function(fn) {
            fn();
          });

          //copy the list of elements so that successive
          //animations won't conflict if they're added before
          //the closing animation timeout has run
          var elementQueueSnapshot = [];
          var animationCounterSnapshot = animationCounter;
          forEach(animationElementQueue, function(elm) {
            elementQueueSnapshot.push(elm);
          });

          $timeout(function() {
            closeAllAnimations(elementQueueSnapshot, animationCounterSnapshot);
            elementQueueSnapshot = null;
          }, closingAnimationTime, false);

          animationReflowQueue = [];
          animationElementQueue = [];
          cancelAnimationReflow = null;
          lookupCache = {};
          closingAnimationTime = 0;
          animationCounter++;
        });
      }

      function closeAllAnimations(elements, count) {
        forEach(elements, function(element) {
          var elementData = element.data(NG_ANIMATE_CSS_DATA_KEY);
          if(elementData && elementData.animationCount == count) {
            (elementData.closeAnimationFn || noop)();
          }
        });
      }

      function getElementAnimationDetails(element, cacheKey) {
        var data = cacheKey ? lookupCache[cacheKey] : null;
        if(!data) {
          var transitionDuration = 0;
          var transitionDelay = 0;
          var animationDuration = 0;
          var animationDelay = 0;
          var transitionDelayStyle;
          var animationDelayStyle;
          var transitionDurationStyle;
          var transitionPropertyStyle;

          //we want all the styles defined before and after
          forEach(element, function(element) {
            if (element.nodeType == ELEMENT_NODE) {
              var elementStyles = $window.getComputedStyle(element) || {};

              transitionDurationStyle = elementStyles[TRANSITION_PROP + DURATION_KEY];

              transitionDuration = Math.max(parseMaxTime(transitionDurationStyle), transitionDuration);

              transitionPropertyStyle = elementStyles[TRANSITION_PROP + PROPERTY_KEY];

              transitionDelayStyle = elementStyles[TRANSITION_PROP + DELAY_KEY];

              transitionDelay  = Math.max(parseMaxTime(transitionDelayStyle), transitionDelay);

              animationDelayStyle = elementStyles[ANIMATION_PROP + DELAY_KEY];

              animationDelay   = Math.max(parseMaxTime(animationDelayStyle), animationDelay);

              var aDuration  = parseMaxTime(elementStyles[ANIMATION_PROP + DURATION_KEY]);

              if(aDuration > 0) {
                aDuration *= parseInt(elementStyles[ANIMATION_PROP + ANIMATION_ITERATION_COUNT_KEY], 10) || 1;
              }

              animationDuration = Math.max(aDuration, animationDuration);
            }
          });
          data = {
            total : 0,
            transitionPropertyStyle: transitionPropertyStyle,
            transitionDurationStyle: transitionDurationStyle,
            transitionDelayStyle: transitionDelayStyle,
            transitionDelay: transitionDelay,
            transitionDuration: transitionDuration,
            animationDelayStyle: animationDelayStyle,
            animationDelay: animationDelay,
            animationDuration: animationDuration
          };
          if(cacheKey) {
            lookupCache[cacheKey] = data;
          }
        }
        return data;
      }

      function parseMaxTime(str) {
        var maxValue = 0;
        var values = angular.isString(str) ?
          str.split(/\s*,\s*/) :
          [];
        forEach(values, function(value) {
          maxValue = Math.max(parseFloat(value) || 0, maxValue);
        });
        return maxValue;
      }

      function getCacheKey(element) {
        var parentElement = element.parent();
        var parentID = parentElement.data(NG_ANIMATE_PARENT_KEY);
        if(!parentID) {
          parentElement.data(NG_ANIMATE_PARENT_KEY, ++parentCounter);
          parentID = parentCounter;
        }
        return parentID + '-' + extractElementNode(element).className;
      }

      function animateSetup(element, className, calculationDecorator) {
        var cacheKey = getCacheKey(element);
        var eventCacheKey = cacheKey + ' ' + className;
        var stagger = {};
        var itemIndex = lookupCache[eventCacheKey] ? ++lookupCache[eventCacheKey].total : 0;

        if(itemIndex > 0) {
          var staggerClassName = className + '-stagger';
          var staggerCacheKey = cacheKey + ' ' + staggerClassName;
          var applyClasses = !lookupCache[staggerCacheKey];

          applyClasses && element.addClass(staggerClassName);

          stagger = getElementAnimationDetails(element, staggerCacheKey);

          applyClasses && element.removeClass(staggerClassName);
        }

        /* the animation itself may need to add/remove special CSS classes
         * before calculating the anmation styles */
        calculationDecorator = calculationDecorator ||
                               function(fn) { return fn(); };

        element.addClass(className);

        var timings = calculationDecorator(function() {
          return getElementAnimationDetails(element, eventCacheKey);
        });

        /* there is no point in performing a reflow if the animation
           timeout is empty (this would cause a flicker bug normally
           in the page. There is also no point in performing an animation
           that only has a delay and no duration */
        var maxDelay = Math.max(timings.transitionDelay, timings.animationDelay);
        var maxDuration = Math.max(timings.transitionDuration, timings.animationDuration);
        if(maxDuration === 0) {
          element.removeClass(className);
          return false;
        }

        //temporarily disable the transition so that the enter styles
        //don't animate twice (this is here to avoid a bug in Chrome/FF).
        var activeClassName = '';
        timings.transitionDuration > 0 ?
          blockTransitions(element) :
          blockKeyframeAnimations(element);

        forEach(className.split(' '), function(klass, i) {
          activeClassName += (i > 0 ? ' ' : '') + klass + '-active';
        });

        element.data(NG_ANIMATE_CSS_DATA_KEY, {
          className : className,
          activeClassName : activeClassName,
          maxDuration : maxDuration,
          maxDelay : maxDelay,
          classes : className + ' ' + activeClassName,
          timings : timings,
          stagger : stagger,
          itemIndex : itemIndex
        });

        return true;
      }

      function blockTransitions(element) {
        extractElementNode(element).style[TRANSITION_PROP + PROPERTY_KEY] = 'none';
      }

      function blockKeyframeAnimations(element) {
        extractElementNode(element).style[ANIMATION_PROP] = 'none 0s';
      }

      function unblockTransitions(element) {
        var prop = TRANSITION_PROP + PROPERTY_KEY;
        var node = extractElementNode(element);
        if(node.style[prop] && node.style[prop].length > 0) {
          node.style[prop] = '';
        }
      }

      function unblockKeyframeAnimations(element) {
        var prop = ANIMATION_PROP;
        var node = extractElementNode(element);
        if(node.style[prop] && node.style[prop].length > 0) {
          node.style[prop] = '';
        }
      }

      function animateRun(element, className, activeAnimationComplete) {
        var elementData = element.data(NG_ANIMATE_CSS_DATA_KEY);
        var node = extractElementNode(element);
        if(node.className.indexOf(className) == -1 || !elementData) {
          activeAnimationComplete();
          return;
        }

        var timings = elementData.timings;
        var stagger = elementData.stagger;
        var maxDuration = elementData.maxDuration;
        var activeClassName = elementData.activeClassName;
        var maxDelayTime = Math.max(timings.transitionDelay, timings.animationDelay) * ONE_SECOND;
        var startTime = Date.now();
        var css3AnimationEvents = ANIMATIONEND_EVENT + ' ' + TRANSITIONEND_EVENT;
        var itemIndex = elementData.itemIndex;

        var style = '', appliedStyles = [];
        if(timings.transitionDuration > 0) {
          var propertyStyle = timings.transitionPropertyStyle;
          if(propertyStyle.indexOf('all') == -1) {
            style += CSS_PREFIX + 'transition-property: ' + propertyStyle + ';';
            style += CSS_PREFIX + 'transition-duration: ' + timings.transitionDurationStyle + ';';
            appliedStyles.push(CSS_PREFIX + 'transition-property');
            appliedStyles.push(CSS_PREFIX + 'transition-duration');
          }
        }

        if(itemIndex > 0) {
          if(stagger.transitionDelay > 0 && stagger.transitionDuration === 0) {
            var delayStyle = timings.transitionDelayStyle;
            style += CSS_PREFIX + 'transition-delay: ' +
                     prepareStaggerDelay(delayStyle, stagger.transitionDelay, itemIndex) + '; ';
            appliedStyles.push(CSS_PREFIX + 'transition-delay');
          }

          if(stagger.animationDelay > 0 && stagger.animationDuration === 0) {
            style += CSS_PREFIX + 'animation-delay: ' +
                     prepareStaggerDelay(timings.animationDelayStyle, stagger.animationDelay, itemIndex) + '; ';
            appliedStyles.push(CSS_PREFIX + 'animation-delay');
          }
        }

        if(appliedStyles.length > 0) {
          //the element being animated may sometimes contain comment nodes in
          //the jqLite object, so we're safe to use a single variable to house
          //the styles since there is always only one element being animated
          var oldStyle = node.getAttribute('style') || '';
          node.setAttribute('style', oldStyle + ' ' + style);
        }

        element.on(css3AnimationEvents, onAnimationProgress);
        element.addClass(activeClassName);
        elementData.closeAnimationFn = function() {
          onEnd();
          activeAnimationComplete();
        };
        return onEnd;

        // This will automatically be called by $animate so
        // there is no need to attach this internally to the
        // timeout done method.
        function onEnd(cancelled) {
          element.off(css3AnimationEvents, onAnimationProgress);
          element.removeClass(activeClassName);
          animateClose(element, className);
          var node = extractElementNode(element);
          for (var i in appliedStyles) {
            node.style.removeProperty(appliedStyles[i]);
          }
        }

        function onAnimationProgress(event) {
          event.stopPropagation();
          var ev = event.originalEvent || event;
          var timeStamp = ev.$manualTimeStamp || ev.timeStamp || Date.now();
          
          /* Firefox (or possibly just Gecko) likes to not round values up
           * when a ms measurement is used for the animation */
          var elapsedTime = parseFloat(ev.elapsedTime.toFixed(ELAPSED_TIME_MAX_DECIMAL_PLACES));

          /* $manualTimeStamp is a mocked timeStamp value which is set
           * within browserTrigger(). This is only here so that tests can
           * mock animations properly. Real events fallback to event.timeStamp,
           * or, if they don't, then a timeStamp is automatically created for them.
           * We're checking to see if the timeStamp surpasses the expected delay,
           * but we're using elapsedTime instead of the timeStamp on the 2nd
           * pre-condition since animations sometimes close off early */
          if(Math.max(timeStamp - startTime, 0) >= maxDelayTime && elapsedTime >= maxDuration) {
            activeAnimationComplete();
          }
        }
      }

      function prepareStaggerDelay(delayStyle, staggerDelay, index) {
        var style = '';
        forEach(delayStyle.split(','), function(val, i) {
          style += (i > 0 ? ',' : '') +
                   (index * staggerDelay + parseInt(val, 10)) + 's';
        });
        return style;
      }

      function animateBefore(element, className, calculationDecorator) {
        if(animateSetup(element, className, calculationDecorator)) {
          return function(cancelled) {
            cancelled && animateClose(element, className);
          };
        }
      }

      function animateAfter(element, className, afterAnimationComplete) {
        if(element.data(NG_ANIMATE_CSS_DATA_KEY)) {
          return animateRun(element, className, afterAnimationComplete);
        } else {
          animateClose(element, className);
          afterAnimationComplete();
        }
      }

      function animate(element, className, animationComplete) {
        //If the animateSetup function doesn't bother returning a
        //cancellation function then it means that there is no animation
        //to perform at all
        var preReflowCancellation = animateBefore(element, className);
        if(!preReflowCancellation) {
          animationComplete();
          return;
        }

        //There are two cancellation functions: one is before the first
        //reflow animation and the second is during the active state
        //animation. The first function will take care of removing the
        //data from the element which will not make the 2nd animation
        //happen in the first place
        var cancel = preReflowCancellation;
        afterReflow(element, function() {
          unblockTransitions(element);
          unblockKeyframeAnimations(element);
          //once the reflow is complete then we point cancel to
          //the new cancellation function which will remove all of the
          //animation properties from the active animation
          cancel = animateAfter(element, className, animationComplete);
        });

        return function(cancelled) {
          (cancel || noop)(cancelled);
        };
      }

      function animateClose(element, className) {
        element.removeClass(className);
        element.removeData(NG_ANIMATE_CSS_DATA_KEY);
      }

      return {
        allowCancel : function(element, animationEvent, className) {
          //always cancel the current animation if it is a
          //structural animation
          var oldClasses = (element.data(NG_ANIMATE_CSS_DATA_KEY) || {}).classes;
          if(!oldClasses || ['enter','leave','move'].indexOf(animationEvent) >= 0) {
            return true;
          }

          var parentElement = element.parent();
          var clone = angular.element(extractElementNode(element).cloneNode());

          //make the element super hidden and override any CSS style values
          clone.attr('style','position:absolute; top:-9999px; left:-9999px');
          clone.removeAttr('id');
          clone.empty();

          forEach(oldClasses.split(' '), function(klass) {
            clone.removeClass(klass);
          });

          var suffix = animationEvent == 'addClass' ? '-add' : '-remove';
          clone.addClass(suffixClasses(className, suffix));
          parentElement.append(clone);

          var timings = getElementAnimationDetails(clone);
          clone.remove();

          return Math.max(timings.transitionDuration, timings.animationDuration) > 0;
        },

        enter : function(element, animationCompleted) {
          return animate(element, 'ng-enter', animationCompleted);
        },

        leave : function(element, animationCompleted) {
          return animate(element, 'ng-leave', animationCompleted);
        },

        move : function(element, animationCompleted) {
          return animate(element, 'ng-move', animationCompleted);
        },

        beforeAddClass : function(element, className, animationCompleted) {
          var cancellationMethod = animateBefore(element, suffixClasses(className, '-add'), function(fn) {

            /* when a CSS class is added to an element then the transition style that
             * is applied is the transition defined on the element when the CSS class
             * is added at the time of the animation. This is how CSS3 functions
             * outside of ngAnimate. */
            element.addClass(className);
            var timings = fn();
            element.removeClass(className);
            return timings;
          });

          if(cancellationMethod) {
            afterReflow(element, function() {
              unblockTransitions(element);
              unblockKeyframeAnimations(element);
              animationCompleted();
            });
            return cancellationMethod;
          }
          animationCompleted();
        },

        addClass : function(element, className, animationCompleted) {
          return animateAfter(element, suffixClasses(className, '-add'), animationCompleted);
        },

        beforeRemoveClass : function(element, className, animationCompleted) {
          var cancellationMethod = animateBefore(element, suffixClasses(className, '-remove'), function(fn) {
            /* when classes are removed from an element then the transition style
             * that is applied is the transition defined on the element without the
             * CSS class being there. This is how CSS3 functions outside of ngAnimate.
             * http://plnkr.co/edit/j8OzgTNxHTb4n3zLyjGW?p=preview */
            var klass = element.attr('class');
            element.removeClass(className);
            var timings = fn();
            element.attr('class', klass);
            return timings;
          });

          if(cancellationMethod) {
            afterReflow(element, function() {
              unblockTransitions(element);
              unblockKeyframeAnimations(element);
              animationCompleted();
            });
            return cancellationMethod;
          }
          animationCompleted();
        },

        removeClass : function(element, className, animationCompleted) {
          return animateAfter(element, suffixClasses(className, '-remove'), animationCompleted);
        }
      };

      function suffixClasses(classes, suffix) {
        var className = '';
        classes = angular.isArray(classes) ? classes : classes.split(/\s+/);
        forEach(classes, function(klass, i) {
          if(klass && klass.length > 0) {
            className += (i > 0 ? ' ' : '') + klass + suffix;
          }
        });
        return className;
      }
    }]);
  }]);

App = Ember.Application.create({});

var posts = [{
  id: '1',
  title: "Rails is Omakase",
  author: { name: "d2h" },
  date: new Date('12-27-2012'),
  excerpt: "There are lots of � la carte software environments in this world. Places where in order to eat, you must first carefully look over the menu of options to order exactly what you want.",
  body: "I want this for my ORM, I want that for my template language, and let's finish it off with this routing library. Of course, you're going to have to know what you want, and you'll rarely have your horizon expanded if you always order the same thing, but there it is. It's a very popular way of consuming software.\n\nRails is not that. Rails is omakase."
}, {
  id: '2',
  title: "The Parley Letter",
  author: { name: "d2h" },
  date: new Date('12-24-2012'),
  excerpt: "My [appearance on the Ruby Rogues podcast](http://rubyrogues.com/056-rr-david-heinemeier-hansson/) recently came up for discussion again on the private Parley mailing list.",
  body: "A long list of topics were raised and I took a time to ramble at large about all of them at once. Apologies for not taking the time to be more succinct, but at least each topic has a header so you can skip stuff you don't care about.\n\n### Maintainability\n\nIt's simply not true to say that I don't care about maintainability. I still work on the oldest Rails app in the world."  
}];


App.Users = DS.Model.extend({
	username: DS.attr('string')
});

App.ApplicationAdapter = DS.RESTAdapter.extend({
	host: "http://localhost:8000/blog",
	namespace: "api"
});

App.Router.map(function() {
  this.resource('about');
  this.resource('posts', function() {
    this.resource('post', { path: ':post_id' });
  });
  this.resource('users');
});

App.UsersRoute = Ember.Route.extend({
	model: function(params) {
		return this.get("store").find("users");
	}
});

App.PostsRoute = Ember.Route.extend({
  model: function(params) {
    return Ember.$.getJSON('http://localhost:8000/blog/api/posts/?format=json').then(function(data) {
    	return data.results;
    });
  },
  setupController: function(controller, posts) {
	  controller.set('model', posts);
  }
});

App.PostRoute = Ember.Route.extend({
  model: function(params) {
    //return posts.findBy('id', params.post_id);
	  return Ember.$.getJSON('http://localhost:8000/blog/api/posts/' + params.post_id + '/?format=json').then(function(data) {
		  return data;
	  });
  }
});

App.PostController = Ember.ObjectController.extend({
  isEditing: false,

  edit: function() {
    this.set('isEditing', true);
  },

  doneEditing: function() {
    this.set('isEditing', false);
    this.get('store').commit();
  }
});

Ember.Handlebars.helper('format-markdown', function(input) {
  return new Handlebars.SafeString(input);
});

Ember.Handlebars.helper('format-date', function(date) {
  return moment(date).fromNow();
});

App = Ember.Application.create({});



App.ApplicationAdapter = DS.FixtureAdapter.extend();

App.User = DS.Model.extend({
    username: DS.attr()
});

App.Blog = DS.Model.extend({
    created: DS.attr(),
    title: DS.attr("string"),
    creator: DS.attr("string")
});

App.Blog.FIXTURES = [
    {
        id: 1,
        created: (new Date()),
        title: "Science",
        creator: "eric"
    },
    {
        id: 2,
        created: (new Date()),
        title: "Philosophy",
        creator: "eric"
    }
];

App.Post = DS.Model.extend({
    title: DS.attr("string"),
    author: DS.attr("string"),
    
    created: DS.attr(),
    modified: DS.attr(),
    
    ordering: DS.attr(),

    parent_content_type: DS.attr(),
    parent_id: DS.attr()
});

App.Post.FIXTURES = [
    {
        id: 1,
        title: "Title here",
        author: "eric",
        created: (new Date()),
        modified: (new Date()),
        ordering: 0,
        parent_content_type: "blog",
        parent_id: 1
    }
];



App.Router.reopen({
    rootURL: "/blog/"
});

App.Router.map(function() {
    this.resource("blogs", {path: "/"});
    this.resource("blog", {path: "/:blog_id"});    
    this.resource("posts", { path: "/posts" });
});


App.BlogsRoute = Ember.Route.extend({
    model: function() {
        var store = this.get("store");
        return store.find("blog");
    },
    setupController: function(controller, model) {
        controller.set("blogs", model);
    }
});


App.BlogsController = Ember.ArrayController.extend({
    actions: {
        createBlog: function() {
            console.log("CREATE");
            var blogName = this.get("blogName");
            console.log(blogName);

            var rec = this.store.createRecord("blog", {
                created: (new Date()),
                title: blogName,
                creator: "No User"
            });

            this.set("blogName", "");
        }
    }
});


App.BlogRoute = Ember.Route.extend({
    model: function(param) {
        var ret = {title: "static title"};
        ret = this.get("store").find("blog", param.blog_id);
        return ret;
    },
    setupController: function(controller, model) {
        controller.set("model", model);
    }
})

App.BlogController = Ember.ObjectController.extend({
    actions: {
        test: function() {
            console.log(this.get("model"));            
        }
    }
});



/**
* @ngdoc overview
* @name ui.bootstrap.carousel
*
* @description
* AngularJS version of an image carousel.
*
*/
angular.module('ui.bootstrap.carousel', ['ui.bootstrap.transition'])
.controller('CarouselController', ['$scope', '$timeout', '$transition', '$q', function ($scope, $timeout, $transition, $q) {
  var self = this,
    slides = self.slides = [],
    currentIndex = -1,
    currentTimeout, isPlaying;
  self.currentSlide = null;

  var destroyed = false;
  /* direction: "prev" or "next" */
  self.select = function(nextSlide, direction) {
    var nextIndex = slides.indexOf(nextSlide);
    //Decide direction if it's not given
    if (direction === undefined) {
      direction = nextIndex > currentIndex ? "next" : "prev";
    }
    if (nextSlide && nextSlide !== self.currentSlide) {
      if ($scope.$currentTransition) {
        $scope.$currentTransition.cancel();
        //Timeout so ng-class in template has time to fix classes for finished slide
        $timeout(goNext);
      } else {
        goNext();
      }
    }
    function goNext() {
      // Scope has been destroyed, stop here.
      if (destroyed) { return; }
      //If we have a slide to transition from and we have a transition type and we're allowed, go
      if (self.currentSlide && angular.isString(direction) && !$scope.noTransition && nextSlide.$element) {
        //We shouldn't do class manip in here, but it's the same weird thing bootstrap does. need to fix sometime
        nextSlide.$element.addClass(direction);
        var reflow = nextSlide.$element[0].offsetWidth; //force reflow

        //Set all other slides to stop doing their stuff for the new transition
        angular.forEach(slides, function(slide) {
          angular.extend(slide, {direction: '', entering: false, leaving: false, active: false});
        });
        angular.extend(nextSlide, {direction: direction, active: true, entering: true});
        angular.extend(self.currentSlide||{}, {direction: direction, leaving: true});

        $scope.$currentTransition = $transition(nextSlide.$element, {});
        //We have to create new pointers inside a closure since next & current will change
        (function(next,current) {
          $scope.$currentTransition.then(
            function(){ transitionDone(next, current); },
            function(){ transitionDone(next, current); }
          );
        }(nextSlide, self.currentSlide));
      } else {
        transitionDone(nextSlide, self.currentSlide);
      }
      self.currentSlide = nextSlide;
      currentIndex = nextIndex;
      //every time you change slides, reset the timer
      restartTimer();
    }
    function transitionDone(next, current) {
      angular.extend(next, {direction: '', active: true, leaving: false, entering: false});
      angular.extend(current||{}, {direction: '', active: false, leaving: false, entering: false});
      $scope.$currentTransition = null;
    }
  };
  $scope.$on('$destroy', function () {
    destroyed = true;
  });

  /* Allow outside people to call indexOf on slides array */
  self.indexOfSlide = function(slide) {
    return slides.indexOf(slide);
  };

  $scope.next = function() {
    var newIndex = (currentIndex + 1) % slides.length;

    //Prevent this user-triggered transition from occurring if there is already one in progress
    if (!$scope.$currentTransition) {
      return self.select(slides[newIndex], 'next');
    }
  };

  $scope.prev = function() {
    var newIndex = currentIndex - 1 < 0 ? slides.length - 1 : currentIndex - 1;

    //Prevent this user-triggered transition from occurring if there is already one in progress
    if (!$scope.$currentTransition) {
      return self.select(slides[newIndex], 'prev');
    }
  };

  $scope.select = function(slide) {
    self.select(slide);
  };

  $scope.isActive = function(slide) {
     return self.currentSlide === slide;
  };

  $scope.slides = function() {
    return slides;
  };

  $scope.$watch('interval', restartTimer);
  $scope.$on('$destroy', resetTimer);

  function restartTimer() {
    resetTimer();
    var interval = +$scope.interval;
    if (!isNaN(interval) && interval>=0) {
      currentTimeout = $timeout(timerFn, interval);
    }
  }

  function resetTimer() {
    if (currentTimeout) {
      $timeout.cancel(currentTimeout);
      currentTimeout = null;
    }
  }

  function timerFn() {
    if (isPlaying) {
      $scope.next();
      restartTimer();
    } else {
      $scope.pause();
    }
  }

  $scope.play = function() {
    if (!isPlaying) {
      isPlaying = true;
      restartTimer();
    }
  };
  $scope.pause = function() {
    if (!$scope.noPause) {
      isPlaying = false;
      resetTimer();
    }
  };

  self.addSlide = function(slide, element) {
    slide.$element = element;
    slides.push(slide);
    //if this is the first slide or the slide is set to active, select it
    if(slides.length === 1 || slide.active) {
      self.select(slides[slides.length-1]);
      if (slides.length == 1) {
        $scope.play();
      }
    } else {
      slide.active = false;
    }
  };

  self.removeSlide = function(slide) {
    //get the index of the slide inside the carousel
    var index = slides.indexOf(slide);
    slides.splice(index, 1);
    if (slides.length > 0 && slide.active) {
      if (index >= slides.length) {
        self.select(slides[index-1]);
      } else {
        self.select(slides[index]);
      }
    } else if (currentIndex > index) {
      currentIndex--;
    }
  };

}])

/**
 * @ngdoc directive
 * @name ui.bootstrap.carousel.directive:carousel
 * @restrict EA
 *
 * @description
 * Carousel is the outer container for a set of image 'slides' to showcase.
 *
 * @param {number=} interval The time, in milliseconds, that it will take the carousel to go to the next slide.
 * @param {boolean=} noTransition Whether to disable transitions on the carousel.
 * @param {boolean=} noPause Whether to disable pausing on the carousel (by default, the carousel interval pauses on hover).
 *
 * @example
<example module="ui.bootstrap">
  <file name="index.html">
    <carousel>
      <slide>
        <img src="http://placekitten.com/150/150" style="margin:auto;">
        <div class="carousel-caption">
          <p>Beautiful!</p>
        </div>
      </slide>
      <slide>
        <img src="http://placekitten.com/100/150" style="margin:auto;">
        <div class="carousel-caption">
          <p>D'aww!</p>
        </div>
      </slide>
    </carousel>
  </file>
  <file name="demo.css">
    .carousel-indicators {
      top: auto;
      bottom: 15px;
    }
  </file>
</example>
 */
.directive('carousel', [function() {
  return {
    restrict: 'EA',
    transclude: true,
    replace: true,
    controller: 'CarouselController',
    require: 'carousel',
    templateUrl: 'template/carousel/carousel.html',
    scope: {
      interval: '=',
      noTransition: '=',
      noPause: '='
    }
  };
}])

/**
 * @ngdoc directive
 * @name ui.bootstrap.carousel.directive:slide
 * @restrict EA
 *
 * @description
 * Creates a slide inside a {@link ui.bootstrap.carousel.directive:carousel carousel}.  Must be placed as a child of a carousel element.
 *
 * @param {boolean=} active Model binding, whether or not this slide is currently active.
 *
 * @example
<example module="ui.bootstrap">
  <file name="index.html">
<div ng-controller="CarouselDemoCtrl">
  <carousel>
    <slide ng-repeat="slide in slides" active="slide.active">
      <img ng-src="{{slide.image}}" style="margin:auto;">
      <div class="carousel-caption">
        <h4>Slide {{$index}}</h4>
        <p>{{slide.text}}</p>
      </div>
    </slide>
  </carousel>
  <div class="row-fluid">
    <div class="span6">
      <ul>
        <li ng-repeat="slide in slides">
          <button class="btn btn-mini" ng-class="{'btn-info': !slide.active, 'btn-success': slide.active}" ng-disabled="slide.active" ng-click="slide.active = true">select</button>
          {{$index}}: {{slide.text}}
        </li>
      </ul>
      <a class="btn" ng-click="addSlide()">Add Slide</a>
    </div>
    <div class="span6">
      Interval, in milliseconds: <input type="number" ng-model="myInterval">
      <br />Enter a negative number to stop the interval.
    </div>
  </div>
</div>
  </file>
  <file name="script.js">
function CarouselDemoCtrl($scope) {
  $scope.myInterval = 5000;
  var slides = $scope.slides = [];
  $scope.addSlide = function() {
    var newWidth = 200 + ((slides.length + (25 * slides.length)) % 150);
    slides.push({
      image: 'http://placekitten.com/' + newWidth + '/200',
      text: ['More','Extra','Lots of','Surplus'][slides.length % 4] + ' '
        ['Cats', 'Kittys', 'Felines', 'Cutes'][slides.length % 4]
    });
  };
  for (var i=0; i<4; i++) $scope.addSlide();
}
  </file>
  <file name="demo.css">
    .carousel-indicators {
      top: auto;
      bottom: 15px;
    }
  </file>
</example>
*/

.directive('slide', ['$parse', function($parse) {
  return {
    require: '^carousel',
    restrict: 'EA',
    transclude: true,
    replace: true,
    templateUrl: 'template/carousel/slide.html',
    scope: {
    },
    link: function (scope, element, attrs, carouselCtrl) {
      //Set up optional 'active' = binding
      if (attrs.active) {
        var getActive = $parse(attrs.active);
        var setActive = getActive.assign;
        var lastValue = scope.active = getActive(scope.$parent);
        scope.$watch(function parentActiveWatch() {
          var parentActive = getActive(scope.$parent);

          if (parentActive !== scope.active) {
            // we are out of sync and need to copy
            if (parentActive !== lastValue) {
              // parent changed and it has precedence
              lastValue = scope.active = parentActive;
            } else {
              // if the parent can be assigned then do so
              setActive(scope.$parent, parentActive = lastValue = scope.active);
            }
          }
          return parentActive;
        });
      }

      carouselCtrl.addSlide(scope, element);
      //when the scope is destroyed then remove the slide from the current slides array
      scope.$on('$destroy', function() {
        carouselCtrl.removeSlide(scope);
      });

      scope.$watch('active', function(active) {
        if (active) {
          carouselCtrl.select(scope);
        }
      });
    }
  };
}]);

App = Ember.Application.create({
    LOG_TRANSITIONS: true
});

var AppCache = {
    models: [],
    current: {}
};


Ember.$.ajaxSetup({
    beforeSend: function(xhr) {
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.setRequestHeader("Accept", "application/json, text/javascript");
    }
});


App.ApplicationAdapter = DS.RESTAdapter.extend({
    namespace: 'blog/api',
    find: function(store, type, id) {
        console.log("FIND");
        console.log(store);
        console.log(type);
        console.log(id);
    }
});

App.Blog = DS.Model.extend({
    title: DS.attr()
});

App.Router.reopen({
    rootURL: "/blog/"
});

App.Router.map(function() {
    this.resource("index", {path: "/"}, function() {
        this.resource("frontpage", {path: "/"});
        this.resource("blogs", {path: "/blogs"});
        this.resource("blog", {path: "/:blog_id"});
        this.resource("post", { path: "/post/:post_id" });
        this.resource("reply", { path: "/post/:post_id/:reply_id" });
    });
});


App.IndexRoute = Ember.Route.extend({
    model: function(param) {
        return {
            server: window.server
        }
    },
    setupController: function(controller, model) {
        console.log("IndexRoute > setupController");
        console.log(controller);
        controller.set("model", model);
        controller.set("server", model);
    }
});

App.IndexController = Ember.ObjectController.extend({
});


App.FrontpageRoute = Ember.Route.extend({
    model: function() {
        console.log("Index Route > model");
        return Ember.$.ajax("/blog/api/posts")
    }
});

App.BlogsRoute = Ember.Route.extend({
    model: function() {
        console.log("IndexRoute > Model");
        return Ember.$.ajax("/blog/api/blogs");
        //return this.store.find('blog');
    },
    setupController: function(controller, model) {
        console.log("BlogsRoute > setupController");

        AppCache.models.push(model);
        AppCache.current.blogs = model;
        controller.set("model", model.results);
        controller.set("blogs", model.results);
    }
});

App.BlogsController = Ember.ObjectController.extend({
    actions: {
        createBlog: function() {
            console.log("CREATE");
            var blogName = this.get("blogName");
            console.log(blogName);

            var rec = this.store.createRecord("blog", {
                created: (new Date()),
                title: blogName,
                creator: "No User"
            });

            this.set("blogName", "");
        }
    }
})

App.BlogRoute = Ember.Route.extend({
    model: function(param) {
        //var ret = {title: "static title"};
        //ret = this.get("store").find("blog", param.blog_id);
        //return ret;
        console.log(param);

        var promise = Ember.$.ajax("/blog/api/blogs/" + param.blog_id + "/posts").then(function(json) {
            json.urlSegment = json.urlSegment || {};
            json.urlSegment.blog_id = param.blog_id;
            return json;
        }).then(function(json) {
            return json;
        });

        return promise;
    },
    setupController: function(controller, model) {
        AppCache.models.push(model);
        AppCache.current.blog = model;

        console.log("BlogRoute > setupController");
        controller.set("blog", this.modelFor('index'));
        
        console.log(this.modelFor('index'));
        controller.set("model", model.results);
        controller.set("urlSegment", model.urlSegment);

        console.log("urlSegment: ");
        console.log(model.urlSegment);

        controller.set("posts", model.results);
        controller.set("count", model.count);
        controller.set("next", (model.next!=null)?true:false);
        controller.set("prev", (model.prev!=null)?true:false);
        controller.set("currentPage", 1);
    }
})

App.BlogController = Ember.ArrayController.extend({

    actions: {
        next: function() {
            var _self = this;
            console.log("has next: " + this.get("next"));
            if (this.get("next") == true) {
                this.set("currentPage", this.get("currentPage") + 1);
                console.log(this.get("posts"));

                Ember.$.ajax("/blog/api/blogs/" + _self.get("urlSegment") + "/posts?page=" + _self.get("currentPage")).then(function(data, status, xhr) {
                    console.log("Response " + data);
                    _self.set("posts", data.results);
                    _self.set("count", data.count);
                    _self.set("next", (data.next != null)?true:false);
                    _self.set("prev", (data.prev != null)?true:false);
                });
            }
        },
        prev: function() {
            var _self = this;
            console.log("has next: " + this.get("next"));
            if (this.get("prev") == true) {
                this.set("currentPage", this.get("currentPage") - 1);
                console.log(this.get("posts"));

                Ember.$.ajax("/blog/api/blogs/" + _self.get("urlSegment") + "/posts?page=" + _self.get("currentPage")).then( function(json) {

                    console.log("Response " + json);
                    _self.set("posts", json.results);
                    _self.set("count", json.count);
                    _self.set("next", (json.next != null)?true:false);
                    _self.set("prev", (json.prev != null)?true:false);
                });
            }
        }
    }
});


//
// TODO: Convert all these components to views
// Views can handle 
App.PostSentenceComponent = Ember.Component.extend({
    tagName: "span",
    classNames: ["post-body sentence"],
    classNameBindings: ["isHovering"],
    isHovering: false,
    mouseEnter: function(ev) {
        console.log("MOUSE OVER");
        this.set("isHovering", true);
    },
    mouseLeave: function(ev) {
        this.set("isHovering", false);
    },
    click: function(ev) {
        this.sendAction("action", this.get("model"));
        this.sendAction("test");
    }
});

App.MyPostComponent = Ember.Component.extend({
    actions: {
        show: function(param) {
            console.log("SHOW");
            this.sendAction("action", param);
        },
        test: function(param) {
            console.log("TEST");
        }
    }
    
});



App.PostRoute = Ember.Route.extend({
    beforeModel: function(transition) {
        AppCache.current.asdf.push("test");
        console.log("APPCACHE");
        console.log(AppCache.current);
    },
    model: function(param) {
        console.log("PARAM");
        console.log(param);

        return Ember.$.ajax("/blog/api/posts/" + param.post_id);
    },
    afterModel: function(model) {

    },
    setupController: function(controller, model) {
        console.log("PostRoute > setupController");
        controller.set("model", model);
        controller.set("slave", []);
        controller.set("magic", false);
    },
    renderTemplate: function() {
        this.render("board");
    }
});



App.PostController = Ember.ObjectController.extend({
    bars: [],
    actions: {
        viewSentence: function(bar, sentenceId) {
            var _self = this;

            console.log("bars", _self.get("bars").length);
            console.log("bar", bar);
            console.log("sentenceId", sentenceId);
            
            Ember.$.ajax("/blog/api/sentences/" + sentenceId + "/comments").then(function(json) {
                console.log("viewSentence");

                var bars = _self.get("bars");
                bars[bar + 1] = { model: [] }

                bars.arrayContentWillChange();
                var last = bars.length;

                for (var i = 0; i < json.results.length; i++) {
                    bars[bar].model.push( json.results[i] );
                }

                bars.arrayContentDidChange(0, last, json.results.length);

                console.log("bars", _self.get("bars").length);
                console.log("bar", bar);
                console.log("sentenceId", sentenceId);
                //var slave = _self.get("slave");

                // slave.arrayContentWillChange();
                // var last = slave.length;

                // for (var i = 0; i < json.results.length; i++) {
                //     slave.push( json.results[i] );
                // }

                // slave.arrayContentDidChange(last, 0, json.results.length);
            });
        }
    }
});

App.postModel = Ember.View.extend({});


App.asdf = Ember.View.create({
    templateName: "asdf"
});



App.PostRepresentationComponent = Ember.Component.extend({
    bar: 1,
    actions: {
        viewSentence: function(param) {
            this.sendAction("viewSentence", parseInt( this.get("bar") ) + 1, param);
        }
    }
});

App.SentenceSegmentComponent = Ember.Component.extend({
    tagName: "span",
    classNames: ["post-body sentence"],
    classNameBindings: ["isHovering"],
    isHovering: false,
    mouseEnter: function(jqEv) {
        this.set("isHovering", true);
    },
    click: function(jqEv) {
        console.log("CLICKED");
        this.set("isHovering", true);
        this.sendAction("viewSentence", this.get("level"));
    },
    mouseLeave: function(jqEv) {
        this.set("isHovering", false);
    }
});

App.SlaveView = Ember.View.extend({
    templateName: "slave"
});

App.PostListView = Ember.View.extend({
    level: 0,
    templateName: 'PostListView'
});




var Helpers = {
    USERS_URL: "/blog/api/users", 
    BLOGS_URL: "/blog/api/blogs",
    POSTS_URL: "/blog/api/posts",
    SENTENCES_URL: "/blog/api/sentences",

    getCookie: function(key) {
        var cookieValue = null;
        if (document.cookie && document.cookie != '') {
            var cookies = document.cookie.split(';');
            for (var i = 0; i < cookies.length; i++) {
                var cookie = jQuery.trim(cookies[i]);
                if (cookie.substring(0, key.length + 1) == (key + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(key.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    },

    jsonRequest: function(url, method, params, callback, headers) {
                
        var _this = this;

        var requestId = Math.floor( Math.random() * 1000);

        console.log(["Sending", requestId, url].join(" ") + ":", JSON.stringify(params));
        
        var options = {

            url: url,
            method: method,
            beforeSend: function(xhr) {
                if (headers) {
                    for (var prop in headers) {
                        if ( headers.hasOwnProperty(prop) ) {
                            xhr.setRequestHeader(prop, headers[prop]);
                        }
                    }   
                }
                xhr.setRequestHeader("Content-Type", "application/json");
                xhr.setRequestHeader("Accept", "application/json, text/javascript");
                xhr.setRequestHeader( "X-CSRFToken", _this.getCookie("csrftoken") );
            }
        };

        if (options.method.toLowerCase() != "get") {
            options.data = JSON.stringify(params);
        }

        return $.ajax( options 
                ).done(function(data, textStatus, jqXHR) {

                    console.log(["Receiving", requestId].join(" ") + ":");
                    //console.log(JSON.stringify(data));
                    console.log(data);
                    callback(data, textStatus, jqXHR);

                }).fail(function(jqXHR, textStatus, errorThrown) {
                                
                    console.log(["Receiving", requestId].join(" ") + ":");
                    //console.log(jqXHR.status);
                    //var data = $.parseJSON( jqXHR.responseText );
                    var data = JSON.parse( jqXHR.responseText );
                    console.log(data);

                    callback( data, textStatus, jqXHR );
                });     

    }
};

var AuthModule = {
    TOKENS_URL: "/blog/api-tokens",
    SIGNIN_URL: "/blog/sign-in",
    SIGNOUT_URL: "/blog/sign-out",
    requestToken: function(username, password, callback) {
        var payload = {
            username: username,
            password: password
        };
        return Helpers.jsonRequest(this.TOKENS_URL, "POST", payload, callback);
    }
};


App = Ember.Application.create({
    LOG_TRANSITIONS: true,
    LOG_TRANSITIONS_INTERNAL: true
});

App.Memory = {
    BLOGS_URL: "/blog/api/blogs",
    POSTS_URL: "/blog/api/posts",
    SENTENCES_URL: "/blog/api/sentences",
    models: {
        urls: [],
        blogs: [],
        posts: [],
        sentences: [],
        putURLInCache: function(url, model) {
            // Some URLs contain a collection...
            for (var i = 0; i < this.urls.length; i++) {
                if (this.urls[i].href == url) {
                    return false;
                }
            }
            urls.push({
                href: url,
                model: model
            });
            return true;
        }
    },
    getModelsOfURL: function(url) {
        for (var i = 0; i < this.urls.length; i++) {
            if (this.urls[i].href == url) {
                return this.urls[i].model;
            }
        }
        return null;
    },
    history: [],
    currentWindowStack: []
}

App.Router.reopen({
    rootURL: "/blog/"
});


Ember.$.ajaxSetup({
    beforeSend: function(xhr) {
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.setRequestHeader("Accept", "application/json, text/javascript");
    }
});

App.Router.map(function() {
    this.resource("index", {path: "/"}, function() {
        this.resource("posts", {path: "/posts"});
        this.resource("posts", {path: "/posts/:postId"});
    });
});

App.IndexRoute = Ember.Route.extend({
    model: function(params) {
        return {
            server: window.server,
            memory: App.Memory
        }
    }
});



App.PostsRoute = Ember.Route.extend({
    model: function(params) {

        var _params = params;

        return Ember.RSVP.all([

                // Main model -> Post
                Ember.$.ajax(App.Memory.POSTS_URL + "/" + _params.postId),

                // Comments model -> Collection
                Ember.$.ajax(App.Memory.POSTS_URL + "/" + _params.postId + "/comments"),

                // Sentence Comments -> Collection
                Ember.$.ajax(App.Memory.POSTS_URL + "/" + _params.postId + "/sentence_comments")

            ]).then(function(array) {
                var ret = {};

                ret.main = array[0];
                ret.comments = array[1];
                ret.sidebar = array[2];

                if (ret.main.parent_content_type == "blog") {
                    return Ember.$.ajax(App.Memory.BLOGS_URL + "/" + ret.main.parent_id).then(function(json) {
                        ret.parent = json;
                        return ret;
                    });
                }
                else if (ret.main.parent_content_type == "post") {
                    return Ember.$.ajax(App.Memory.POSTS_URL + "/" + ret.main.parent_id).then(function(json) {
                       ret.parent = json; 
                       return ret;
                    });
                }
                else if (ret.main.parent_content_type == "sentence") {
                    return Ember.$.ajax(App.Memory.SENTENCES_URL+ "/" + ret.main.parent_id).then(function(json) {
                        ret.parent = json;
                        return ret;
                    });
                }

                return ret;
            });

        // return Ember.$.ajax(App.Memory.POSTS_URL + "/" + params.postId).then(function(outerJson) {
            
        //     return Ember.$.ajax(App.Memory.POSTS_URL + "/" + _params.postId + "/comments").then(function(json) {

        //         outerJson.comments = json;

        //         console.log("MODEL");
        //         console.log(outerJson);


        //         console.log("Less than 16?" + outerJson.comments.results.length);

        //         if (outerJson.comments.results.length < 16) {
        //             return Ember.$.ajax(App.Memory.POSTS_URL + "/" + _params.postId + "/sentence_comments").then(function(json) {

        //                 outerJson.sidebar = [];

        //                 for (var i = 0; i < json.results.length; i++) {

        //                     outerJson.sidebar.push(json.results[i]);
        //                 }

        //                 return outerJson;
        //             });
        //         }
        //         else {
        //             return outerJson;
        //         }
        //     });
        // });
    },
    afterModel: function(model, transition) {
        App.Memory.models.posts.push( model );
    },
    setupController: function(controller, model) {
        //controller.set("postListStack", []);
        controller.set("model", model);
        controller.set("parent", model.parent);

        if (model.parent == 'blog')

        controller.set("main", model.main);
        controller.set("sidebar", model.sidebar);
        controller.set("comments", model.comments);

        if (model.main.next != null) {
            controller.set("mainHasNext", true);
        }
        // controller.set("comments", model.comments.results);
        // controller.set("sidebar", model.sidebar);
    }
});


App.PostsController = Ember.Controller.extend(Ember.Evented, {
    comments: [],
    sidebar: [],

    actions: {
        postIsInArray: function(array, pk) {

            for (var i = 0; i < array.length; i++) {
                if (array[i] == pk) {
                    return true;
                }
            }

            return false;
        },
        viewsentence: function(side, sentence) {
            // This triggers a post listing
            // However, do we create a new panel to display the listing
            // or do we reuse an existing listing?
            // Check this via the side argument
            console.log("viewsentence");
            console.log("side", side);
            console.log("sentence", sentence);

            (function(self) {
                Ember.$.ajax("/blog/api/sentences/" + sentence + "/comments")
                    
                    .then(function(json) {
                        // Gets called only if there are comments
                        console.log("THEN");
                        console.log(json);
                        var comments = self.get("comments");
                        var prevLength = comments.length;

                        
                        comments.arrayContentWillChange();

                        self.set("comments", []);

                        for (var i = 0; i < json.results.length; i++) {
                            comments.pushObject(json.results[i]);
                        }

                        console.log("COMMENTS");
                        console.log(comments);

                        comments.arrayContentDidChange(0, prevLength, json.results.length);

                        console.log("COMMENTS");
                        console.log(comments);
                    })
            })(this);
            
        }
    }
});

App.PostsView = Ember.View.extend({
    templateName: "posts"
})


App.ParentViewComponent = Ember.Component.extend({
    templateName: "parent-component",
    isBlog: function(model) {
        if (model.parent_content_type == 'blog') {
            return true;
        }
        return false;
    },
    isPost: function(model) {
        if (model.parent_content_type == 'post') {
            return true;
        }
        return false
    },
    isSentence: function(model) {
        if (model.parent_content_type == 'sentence') {
            return true;
        }
        return false;
    }
});

/**
List views will adjust its computedLeftStyle on instantiation to create
a sliding effect. 

*/
App.PostListView = Ember.View.extend({
    templateName: "post-list-view",
    childClassName: "post-list-view",
    computedLeftStyle: "0",
    initialOffset: "70",
    depth: 0,
    width: "400",
    slideDelay: 50,
    didInsertElement: function() {
        console.log("DID INSERT ELEMENT");
        this.set("computedLeftStyle", this.computeLeftStyleUsingCounter() - this.get("initialOffset"));

        var _self = this;

        Ember.run.later(function() {
            console.log("RUN LATER");
            console.log(_self.get("depth"));
            _self.set("computedLeftStyle", _self.computeLeftStyleUsingCounter());
        }, this.get("slideDelay"));
    },
    computeLeftStyleUsingCounter: function() {
        return this.get("depth") * this.get("width");
    },
    leftStyle: function() {
        console.log("CHANGED LEFTSTYLE");
        var computedLeft = parseInt(this.get("computedLeftStyle"));
        computedLeft = "" + computedLeft + "px";
        return "left: " + computedLeft + "; position: absolute;";
    }.property("computedLeftStyle")
});

App.PostView = Ember.View.extend({
    templateName: "post-view",
    classNames: ["post", "left-panel"]
})

App.SentenceSegmentComponent = Ember.Component.extend({
    tagName: "span",
    classNames: ["sentence"],
    classNameBindings: ["is-hovering", "sentence-has-comments", "selected"],
    selected: false,

    didInsertElement: function() {
        if (this.get("sentence").number_replies > 0) {
            this.$().css({"font-weight": "bold"});
        }
    },
    click: function(ev) {
        console.log("CLICK", this.get("sentence").id);
        this.set("selected", true);
        this.sendAction("viewsentence", this.get("side"), this.get("sentence").id);
    },
    mouseEnter: function(ev) {
        this.set("is-hovering", true);
    },
    mouseLeave: function(ev) {
        this.set("is-hovering", false);
    }
});


App.CommentView = Ember.View.extend({
    templateName: "comment-view",
    classNames: ["comment"]
});

App.PostD3Component = Ember.Component.extend({
    tagName: "div",
    classNames: ["post-d3"],
    uuid: ["postd3", Math.random().toString(36).substring(4)].join(""),
    debug: "Pre-defined",
    didInsertElement: function() {
        Ember.run.scheduleOnce("afterRender", this, this.onCreate);
    },
    onCreate: function() {
        // if (!Ember.isArray(this.get("model"))) {
        //     this.set("model", [this.get("model")]);
        // }

        var selection = d3.select( "#" + this.get("elementId") )
                            .selectAll(".myd3")
                            .data([this.get("model")], function(d){ return d.id; });
        
        var postSelection = selection.enter()
                                    .append("div").html(function(d) {
                                                return "<h3>" + d.title + "</h3>"; 
                                            });


        var sentenceSelection = selection.selectAll("span")
                                    .data(function(d) { return d.sentences; },
                                            function(d,i) { return d.id } );

        //sentenceSelection.filter( function(d) { return.paragraph; } );

        sentenceSelection.enter()
                            .append("span")
                            .text(function(d) {
                                return d.text;
                            });



        selection.exit()
            .remove();
    }
});

/* +------------------------------------------------+
 | Hey, fucker!                                 X |
 +------------------------------------------------+
 | Look at you,  Mr. I'm-too-good-for-G+! What's  |
 | the matter, don't have any friends? That must  |
 | be it, or you'd have a G+ account by now.      |
 |                                                |
 | +-------------------+    +-------------------+ |
 | |  Oh please may I  |    | I'm a giant loser | |
 | | have a G+ account |    |  with no friends  | |
 | +-------------------+    +-------------------+ |
 +------------------------------------------------+
 */


var app = angular.module("app", [])

app.factory("functional", function() {

	return {
		notEmptyString: function(val, length) {
			
			length = 1 || length;
			
			if (val.length < length) {
				return false;
			}
			return true;
		}
	};

})


app.controller("UsernameController", ["$scope", "$http", "functional", function($scope, $http, functional) {

	$scope.user = { username: "" };

}])

app.filter('toHTML', function() {
	return function(text) {
		return text + "FILTERED";
	};
})

app.directive("usernameField", function() {
	return {
		restrict: "E",
		require: "ngModel",
		scope: {
			myModel: "=ngModel",
			errormessageclass: "@",
			validmessageclass: "@",
			fieldname: "@"
		},

		// TODO: NG_BIND_HTML_UNSAFE...

		template: '<div>' + 
					'<input type="text" name="{{fieldname}}" style="{{style}}" ng-model="myModel" autocomplete="off"/>' + 
					' <div ng-if="waitingForAjax == true"><img src="/static/blog/images/ajax-loader.gif" /> {{VALIDATING_MESSAGE}}</div>' + 
					' <div ng-if="validationTimer == null">' + 
					'  <span ng-if="validity == false" class="{{errormessageclass}}">&#215; {{errorMessage}}</span>' + 
					'  <span ng-if="validity == true" class="{{validmessageclass}}">&#10004; {{validMessage}}</span>' + 
					' </div>' + 
				  ' </div>',
		
		controller: function($scope, $http) {

			$scope.VALIDATING_MESSAGE = 'Validating...';

			$scope.INCORRECT_STYLE = "border: solid 1px #E0162B; outline: none; transition: border 0.5s;";
			$scope.CORRECT_STYLE = "border: solid 1px #2cc36b; outline: none; transition: border 0.5s;";
			$scope.WAITING_STYLE = "border: solid 1px #FFE400; outline: none; transition: border 0.5s;"; // #F1C40F
			$scope.NORMAL_STYLE = "border: solid 1px #AAA; outline: none; transition: border 0.5s;";
			$scope.style = $scope.NORMAL_STYLE;

			$scope.ERROR_MESSAGE_STYLE = "color: #E0162B";
			$scope.VALID_MESSAGE_STYLE = "color: #2cc36b";

			$scope.ERROR_USERNAME_REQUIRED = "A username is required!";
			$scope.ERROR_USERNAME_TOO_SHORT = "Username needs to be more than 4 characters long!";
			$scope.ERROR_USERNAME_TAKEN = "That username is already taken!";
			$scope.ERROR_USERNAME_INVALID_TOKENS = "Username can only include alphanumeric characters and dashes.";
			$scope.ERROR_NONE = "";

			$scope.VALID_OKAY = "Ok!";
			$scope.VALID_NONE = "";


			// Do not fire validation when the user just visited page and hasn't typed anything
			$scope.initiated = false;

			// For validating uniqueness
			$scope.REST_URL = "/blog/api/users/";

			// Timer that is set after user has finished typing and waits for response
			$scope.validationTimer = null;
			$scope.VALIDATION_DELAY = 500;

			// Set to true when ajax request is initiated. Sets to false when all validation code finishes.
			$scope.waitingForAjax = false;

			// Null validity means unknown
			$scope.validity = null;

			// Stores invalid usernames taken from REST api
			// TODO: Invalidate cache over time?
			$scope.cache = [];

			// Message to write when validation fails. There are hooks to edit this throughout validation cycle.
			$scope.errorMessage = "";


			function validationGenerator(message, validationCode) {
				
				return function(value) {
				
					this.message = message;

					var ret = validationCode(value);

					if (ret) {
						return true;
					}
					else {
						return false;
					}
				}
			}

			/** 
			Fires tests in order until it hits an error. Therefore, validators should be sorted by priority!
			*/
			function fireTests(target, validatorArguments) {
				
				//TODO: Test this

				var validators = Array.prototype.splice.call(arguments, 1);


				for (var i = 0; i < validators.length; i++) {

					var isValid = validators[i].call( validators[i], target );

					if ( !isValid ) {
						return validators[i].message;
					}
				}

				return null;
			}

			function setErrorMessage(value) {
				$scope.errorMessage = value;

				if ( value != $scope.ERROR_NONE ) {
					$scope.validity = false;
				}
			}

			function setValidMessage(value) {
				setErrorMessage( $scope.ERROR_NONE );
				$scope.validMessage = value;
				$scope.validity = true;
			}


			$scope.isInCache = function(value) {

				var ret = false;

				for (var i = 0; i < $scope.cache.length; i++) {
					if ( $scope.cache[i] == value ) {
						ret = true;
					}
				}

				return ret;
			}

			$scope.preValidation = function() {
				
				$scope.style = $scope.WAITING_STYLE;

			}

			$scope.postValidation = function() {

				$scope.validationTimer = null;
				$scope.waitingForAjax = false;

				$scope.updateStyles();
			}

			$scope.updateStyles = function() {

				if ( $scope.validity == true ) {

					$scope.style = $scope.CORRECT_STYLE;
				}

				else if ( $scope.validity == false ) {

					$scope.style = $scope.INCORRECT_STYLE;
				}

				else { // validity == null

					$scope.style = $scope.WAITING_STYLE;
				}

				if ( $scope.$root.$$phase != '$apply' && $scope.$root.$$phase != '$digest' ) {
					$scope.$apply();
				}
			}

			// Wrapper for AJAX
			$scope.getAJAX = function(value) {
				return $http.get( $scope.REST_URL + value );
			}


			// Validation such as regex to run before we call AJAX validation
			$scope.nonAJAXValidation = function(value) {

				var validTokensValidator = validationGenerator( $scope.ERROR_USERNAME_INVALID_TOKENS, function(value) {

					var regExp = /.*[^A-Za-z0-9\_\-].*/;

					// error becomes the string if invalid chars are detected
					var error = regExp.test(value);

					if ( error ) {
						return false;
					}
					else {
						return true;
					}
				});


				var emptyValidator = validationGenerator( $scope.ERROR_USERNAME_REQUIRED, function(value) {

					if ( value.length < 1 ) {
						return false;
					}
					else {
						return true;
					}
				});

				var lengthValidator = validationGenerator( $scope.ERROR_USERNAME_TOO_SHORT, function(value) {

					if ( value.length <= 3 ) {
						return false;
					}
					else {
						return true;
					}
				});

				//console.log("FIRE TEST: ", fireTests(value, validTokensValidator));

				var error = fireTests(value, validTokensValidator, emptyValidator, lengthValidator);				
				return error;
			}


			// The actual AJAX request goes here
			$scope.triggerValidation = function(value) {

				var nonAjaxError = $scope.nonAJAXValidation(value);

				if ( nonAjaxError != null )  {
					
					setErrorMessage(nonAjaxError);

					$scope.postValidation();
				}
				else {

					// CACHE CHECK	
					if ( $scope.isInCache(value) ) {

						setErrorMessage( $scope.ERROR_USERNAME_TAKEN );
						$scope.postValidation();
					}		
					else {

						$scope.waitingForAjax = true;

						$scope.getAJAX(value).success(function(data, status, headers, config) {

							console.log("Username Found.");

							// Validity is false when username exists - we want a unique username

							setErrorMessage( $scope.ERROR_USERNAME_TAKEN );

							$scope.cache.push( value );

							$scope.postValidation();

						}).error(function(data, status, headers, config){

							console.log("Username Not Found.");

							setValidMessage( $scope.VALID_OKAY );

							$scope.postValidation();
						});
					} // End cache else
				}
			}


			// Timer wrapper for validation. 
			// PostCondition: Sets validationTimer to null when task is finished!
			$scope.validate = function(value) {

				// Skip first validation call
				if ( !$scope.initiated ) {
					$scope.initiated = true;
					return;
				}
					
				$scope.validity = null; // To be resolved after timeout function finishes
				$scope.updateStyles();

				if ( $scope.validationTimer != null ) {

					clearTimeout( $scope.validationTimer );
				}

				$scope.validationTimer = setTimeout(function() {

					$scope.preValidation();
					$scope.triggerValidation(value);
				
				}, $scope.VALIDATION_DELAY);
			}
		},		

		link: function(scope, element, attrs, ngModelCtrl) {

			scope.$watch("myModel", function(value) {

				console.log("Watch");
				scope.validate(value);
			});

		}
	}
});


app.directive("uniqueUsername", function() {	

	return {
		require: "ngModel",
		restrict: "A",
		//template: "<input type='text' />" +
		//		  "<div>{{ valid | toHTML }}<img src='/static/blog/images/ajax-loader.gif' /></div>",

		controller: function($scope, $http) {

			$scope.validating = false;
			$scope.timer = null;
			$scope.cache = [];

			function ajaxIsAvailable() {
				return timer == null;
			}

			function getAJAX(value) {
				return $http.get("/blog/api/users/" + value);
			}


			function isInCache(value) {

				var ret = false;

				for (var i = 0; i < $scope.cache.length; i++) {
					if ( $scope.cache[i] == value ) {
						ret = true;
					}
				}

				return ret;
			}

			function handleValidation(value, ngModelCtrl) {
			
				if ( isInCache(value) ) {
					ngModelCtrl.$setValidity('unique', false);
				}
				else {

					getAJAX(value).success(function(data, status, headers, config) {

						ngModelCtrl.$setValidity('unique', false);
						console.log("Username Found.");


						setValidating(false);

						$scope.cache.push( value );

					}).error(function(data, status, headers, config){

						ngModelCtrl.$setValidity('unique', true);
						console.log("Username Not Found.");

						setValidating(false);
					});
				}
				
			}

			function setValidating(value) {
				$scope.validating = value;
			}


			$scope.validate = function(value, ngModelCtrl) {
				
				setValidating(true);

				if ( $scope.timer != null ) {
					clearTimeout($scope.timer);
				}

				$scope.timer = setTimeout(function() {
					handleValidation(value, ngModelCtrl);
					$scope.timer = null;
				}, 500);
			}

			$scope.represent = function(value, ngModelCtrl) {
				
				if (value === true) {
					ngModelCtrl.$setValidity('unique', true);
				}
				else {
					ngModelCtrl.$setValidity('unique', false);
				}
			}
		},
		link: function(scope, element, attrs, ngModelCtrl) {

			scope.$watch(attrs.ngModel, function(value) {
				//scope.note(value);
				scope.validate(value, ngModelCtrl);
			});

			//scope.$watch("valid", function(value) {
				//scope.note("VALID: " + value);
//				scope.valid = value;
//			});
		}
	};

})


/* CUTESIE
				$scope.invalidateCache = function() {

				console.log("INVALIDATE");
				if ($scope.cache.length > 0) {
					Array.prototype.splice.call( $scope.cache, 0, 1 );
					console.log( $scope.cache );
				}
			}

			$scope.invalidateCacheLoop = function() {
				setInterval( function() { $scope.invalidateCache() }, 12000 );
			}

			$scope.invalidateCacheLoop();

			$scope.available = true;
			$scope.nonHandledRequests = [];

			$scope.cache = [];

			$scope.valid = false;

			$scope.validate = function(value, ngModelCtrl) {

				console.log("VALIDATE");

				var inCache = false;

				for (var i = 0; i < $scope.cache.length; i++) {
					if ( $scope.cache[i].key == value ) {
						$scope.valid = $scope.cache[i].valid;
						inCache = true;
					}
				}

				if ( !inCache ) {
	
					$scope.nonHandledRequests.push(value);	

					while ( $scope.nonHandledRequests.length > 0 ) {

						var value = $scope.nonHandledRequests.pop();

						$http.get("/blog/api/users/" + value).success(function(data, status, headers, config) {

							$scope.valid = false; // Should be unique

							$scope.cache.push({'key': value, valid: false});
							$scope.available = true;

							console.log("CACHE: " + $scope.cache);

							ngModelCtrl.$setValidity('unique', false);

						}).error(function(data, status, headers, config) {

							$scope.valid = true; 

							$scope.cache.push({'key': value, valid: true});
							$scope.available = true;

							ngModelCtrl.$setValidity('unique', true);

							console.log("CACHE: " + $scope.cache);

						});
					}

				}

			};

			$scope.note = function(val) {
				console.log(val);
			};
*/

'use strict';

var $sanitizeMinErr = angular.$$minErr('$sanitize');

/**
 * @ngdoc overview
 * @name ngSanitize
 * @description
 *
 * # ngSanitize
 *
 * The `ngSanitize` module provides functionality to sanitize HTML.
 *
 * {@installModule sanitize}
 *
 * <div doc-module-components="ngSanitize"></div>
 *
 * See {@link ngSanitize.$sanitize `$sanitize`} for usage.
 */

/*
 * HTML Parser By Misko Hevery (misko@hevery.com)
 * based on:  HTML Parser By John Resig (ejohn.org)
 * Original code by Erik Arvidsson, Mozilla Public License
 * http://erik.eae.net/simplehtmlparser/simplehtmlparser.js
 *
 * // Use like so:
 * htmlParser(htmlString, {
 *     start: function(tag, attrs, unary) {},
 *     end: function(tag) {},
 *     chars: function(text) {},
 *     comment: function(text) {}
 * });
 *
 */


/**
 * @ngdoc service
 * @name ngSanitize.$sanitize
 * @function
 *
 * @description
 *   The input is sanitized by parsing the html into tokens. All safe tokens (from a whitelist) are
 *   then serialized back to properly escaped html string. This means that no unsafe input can make
 *   it into the returned string, however, since our parser is more strict than a typical browser
 *   parser, it's possible that some obscure input, which would be recognized as valid HTML by a
 *   browser, won't make it through the sanitizer.
 *
 * @param {string} html Html input.
 * @returns {string} Sanitized html.
 *
 * @example
   <doc:example module="ngSanitize">
   <doc:source>
     <script>
       function Ctrl($scope, $sce) {
         $scope.snippet =
           '<p style="color:blue">an html\n' +
           '<em onmouseover="this.textContent=\'PWN3D!\'">click here</em>\n' +
           'snippet</p>';
         $scope.deliberatelyTrustDangerousSnippet = function() {
           return $sce.trustAsHtml($scope.snippet);
         };
       }
     </script>
     <div ng-controller="Ctrl">
        Snippet: <textarea ng-model="snippet" cols="60" rows="3"></textarea>
       <table>
         <tr>
           <td>Directive</td>
           <td>How</td>
           <td>Source</td>
           <td>Rendered</td>
         </tr>
         <tr id="bind-html-with-sanitize">
           <td>ng-bind-html</td>
           <td>Automatically uses $sanitize</td>
           <td><pre>&lt;div ng-bind-html="snippet"&gt;<br/>&lt;/div&gt;</pre></td>
           <td><div ng-bind-html="snippet"></div></td>
         </tr>
         <tr id="bind-html-with-trust">
           <td>ng-bind-html</td>
           <td>Bypass $sanitize by explicitly trusting the dangerous value</td>
           <td>
           <pre>&lt;div ng-bind-html="deliberatelyTrustDangerousSnippet()"&gt;
&lt;/div&gt;</pre>
           </td>
           <td><div ng-bind-html="deliberatelyTrustDangerousSnippet()"></div></td>
         </tr>
         <tr id="bind-default">
           <td>ng-bind</td>
           <td>Automatically escapes</td>
           <td><pre>&lt;div ng-bind="snippet"&gt;<br/>&lt;/div&gt;</pre></td>
           <td><div ng-bind="snippet"></div></td>
         </tr>
       </table>
       </div>
   </doc:source>
   <doc:scenario>
     it('should sanitize the html snippet by default', function() {
       expect(using('#bind-html-with-sanitize').element('div').html()).
         toBe('<p>an html\n<em>click here</em>\nsnippet</p>');
     });

     it('should inline raw snippet if bound to a trusted value', function() {
       expect(using('#bind-html-with-trust').element("div").html()).
         toBe("<p style=\"color:blue\">an html\n" +
              "<em onmouseover=\"this.textContent='PWN3D!'\">click here</em>\n" +
              "snippet</p>");
     });

     it('should escape snippet without any filter', function() {
       expect(using('#bind-default').element('div').html()).
         toBe("&lt;p style=\"color:blue\"&gt;an html\n" +
              "&lt;em onmouseover=\"this.textContent='PWN3D!'\"&gt;click here&lt;/em&gt;\n" +
              "snippet&lt;/p&gt;");
     });

     it('should update', function() {
       input('snippet').enter('new <b onclick="alert(1)">text</b>');
       expect(using('#bind-html-with-sanitize').element('div').html()).toBe('new <b>text</b>');
       expect(using('#bind-html-with-trust').element('div').html()).toBe(
         'new <b onclick="alert(1)">text</b>');
       expect(using('#bind-default').element('div').html()).toBe(
         "new &lt;b onclick=\"alert(1)\"&gt;text&lt;/b&gt;");
     });
   </doc:scenario>
   </doc:example>
 */
var $sanitize = function(html) {
  var buf = [];
    htmlParser(html, htmlSanitizeWriter(buf));
    return buf.join('');
};


// Regular Expressions for parsing tags and attributes
var START_TAG_REGEXP =
       /^<\s*([\w:-]+)((?:\s+[\w:-]+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*(\/?)\s*>/,
  END_TAG_REGEXP = /^<\s*\/\s*([\w:-]+)[^>]*>/,
  ATTR_REGEXP = /([\w:-]+)(?:\s*=\s*(?:(?:"((?:[^"])*)")|(?:'((?:[^'])*)')|([^>\s]+)))?/g,
  BEGIN_TAG_REGEXP = /^</,
  BEGING_END_TAGE_REGEXP = /^<\s*\//,
  COMMENT_REGEXP = /<!--(.*?)-->/g,
  DOCTYPE_REGEXP = /<!DOCTYPE([^>]*?)>/i,
  CDATA_REGEXP = /<!\[CDATA\[(.*?)]]>/g,
  URI_REGEXP = /^((ftp|https?):\/\/|mailto:|tel:|#)/i,
  // Match everything outside of normal chars and " (quote character)
  NON_ALPHANUMERIC_REGEXP = /([^\#-~| |!])/g;


// Good source of info about elements and attributes
// http://dev.w3.org/html5/spec/Overview.html#semantics
// http://simon.html5.org/html-elements

// Safe Void Elements - HTML5
// http://dev.w3.org/html5/spec/Overview.html#void-elements
var voidElements = makeMap("area,br,col,hr,img,wbr");

// Elements that you can, intentionally, leave open (and which close themselves)
// http://dev.w3.org/html5/spec/Overview.html#optional-tags
var optionalEndTagBlockElements = makeMap("colgroup,dd,dt,li,p,tbody,td,tfoot,th,thead,tr"),
    optionalEndTagInlineElements = makeMap("rp,rt"),
    optionalEndTagElements = angular.extend({},
                                            optionalEndTagInlineElements,
                                            optionalEndTagBlockElements);

// Safe Block Elements - HTML5
var blockElements = angular.extend({}, optionalEndTagBlockElements, makeMap("address,article," +
        "aside,blockquote,caption,center,del,dir,div,dl,figure,figcaption,footer,h1,h2,h3,h4,h5," +
        "h6,header,hgroup,hr,ins,map,menu,nav,ol,pre,script,section,table,ul"));

// Inline Elements - HTML5
var inlineElements = angular.extend({}, optionalEndTagInlineElements, makeMap("a,abbr,acronym,b," +
        "bdi,bdo,big,br,cite,code,del,dfn,em,font,i,img,ins,kbd,label,map,mark,q,ruby,rp,rt,s," +
        "samp,small,span,strike,strong,sub,sup,time,tt,u,var"));


// Special Elements (can contain anything)
var specialElements = makeMap("script,style");

var validElements = angular.extend({},
                                   voidElements,
                                   blockElements,
                                   inlineElements,
                                   optionalEndTagElements);

//Attributes that have href and hence need to be sanitized
var uriAttrs = makeMap("background,cite,href,longdesc,src,usemap");
var validAttrs = angular.extend({}, uriAttrs, makeMap(
    'abbr,align,alt,axis,bgcolor,border,cellpadding,cellspacing,class,clear,'+
    'color,cols,colspan,compact,coords,dir,face,headers,height,hreflang,hspace,'+
    'ismap,lang,language,nohref,nowrap,rel,rev,rows,rowspan,rules,'+
    'scope,scrolling,shape,span,start,summary,target,title,type,'+
    'valign,value,vspace,width'));

function makeMap(str) {
  var obj = {}, items = str.split(','), i;
  for (i = 0; i < items.length; i++) obj[items[i]] = true;
  return obj;
}


/**
 * @example
 * htmlParser(htmlString, {
 *     start: function(tag, attrs, unary) {},
 *     end: function(tag) {},
 *     chars: function(text) {},
 *     comment: function(text) {}
 * });
 *
 * @param {string} html string
 * @param {object} handler
 */
function htmlParser( html, handler ) {
  var index, chars, match, stack = [], last = html;
  stack.last = function() { return stack[ stack.length - 1 ]; };

  while ( html ) {
    chars = true;

    // Make sure we're not in a script or style element
    if ( !stack.last() || !specialElements[ stack.last() ] ) {

      // Comment
      if ( html.indexOf("<!--") === 0 ) {
        // comments containing -- are not allowed unless they terminate the comment
        index = html.indexOf("--", 4);

        if ( index >= 0 && html.lastIndexOf("-->", index) === index) {
          if (handler.comment) handler.comment( html.substring( 4, index ) );
          html = html.substring( index + 3 );
          chars = false;
        }
      // DOCTYPE
      } else if ( DOCTYPE_REGEXP.test(html) ) {
        match = html.match( DOCTYPE_REGEXP );

        if ( match ) {
          html = html.replace( match[0] , '');
          chars = false;
        }
      // end tag
      } else if ( BEGING_END_TAGE_REGEXP.test(html) ) {
        match = html.match( END_TAG_REGEXP );

        if ( match ) {
          html = html.substring( match[0].length );
          match[0].replace( END_TAG_REGEXP, parseEndTag );
          chars = false;
        }

      // start tag
      } else if ( BEGIN_TAG_REGEXP.test(html) ) {
        match = html.match( START_TAG_REGEXP );

        if ( match ) {
          html = html.substring( match[0].length );
          match[0].replace( START_TAG_REGEXP, parseStartTag );
          chars = false;
        }
      }

      if ( chars ) {
        index = html.indexOf("<");

        var text = index < 0 ? html : html.substring( 0, index );
        html = index < 0 ? "" : html.substring( index );

        if (handler.chars) handler.chars( decodeEntities(text) );
      }

    } else {
      html = html.replace(new RegExp("(.*)<\\s*\\/\\s*" + stack.last() + "[^>]*>", 'i'),
        function(all, text){
          text = text.replace(COMMENT_REGEXP, "$1").replace(CDATA_REGEXP, "$1");

          if (handler.chars) handler.chars( decodeEntities(text) );

          return "";
      });

      parseEndTag( "", stack.last() );
    }

    if ( html == last ) {
      throw $sanitizeMinErr('badparse', "The sanitizer was unable to parse the following block " +
                                        "of html: {0}", html);
    }
    last = html;
  }

  // Clean up any remaining tags
  parseEndTag();

  function parseStartTag( tag, tagName, rest, unary ) {
    tagName = angular.lowercase(tagName);
    if ( blockElements[ tagName ] ) {
      while ( stack.last() && inlineElements[ stack.last() ] ) {
        parseEndTag( "", stack.last() );
      }
    }

    if ( optionalEndTagElements[ tagName ] && stack.last() == tagName ) {
      parseEndTag( "", tagName );
    }

    unary = voidElements[ tagName ] || !!unary;

    if ( !unary )
      stack.push( tagName );

    var attrs = {};

    rest.replace(ATTR_REGEXP,
      function(match, name, doubleQuotedValue, singleQuotedValue, unquotedValue) {
        var value = doubleQuotedValue
          || singleQuotedValue
          || unquotedValue
          || '';

        attrs[name] = decodeEntities(value);
    });
    if (handler.start) handler.start( tagName, attrs, unary );
  }

  function parseEndTag( tag, tagName ) {
    var pos = 0, i;
    tagName = angular.lowercase(tagName);
    if ( tagName )
      // Find the closest opened tag of the same type
      for ( pos = stack.length - 1; pos >= 0; pos-- )
        if ( stack[ pos ] == tagName )
          break;

    if ( pos >= 0 ) {
      // Close all the open elements, up the stack
      for ( i = stack.length - 1; i >= pos; i-- )
        if (handler.end) handler.end( stack[ i ] );

      // Remove the open elements from the stack
      stack.length = pos;
    }
  }
}

/**
 * decodes all entities into regular string
 * @param value
 * @returns {string} A string with decoded entities.
 */
var hiddenPre=document.createElement("pre");
function decodeEntities(value) {
  hiddenPre.innerHTML=value.replace(/</g,"&lt;");
  return hiddenPre.innerText || hiddenPre.textContent || '';
}

/**
 * Escapes all potentially dangerous characters, so that the
 * resulting string can be safely inserted into attribute or
 * element text.
 * @param value
 * @returns escaped text
 */
function encodeEntities(value) {
  return value.
    replace(/&/g, '&amp;').
    replace(NON_ALPHANUMERIC_REGEXP, function(value){
      return '&#' + value.charCodeAt(0) + ';';
    }).
    replace(/</g, '&lt;').
    replace(/>/g, '&gt;');
}

/**
 * create an HTML/XML writer which writes to buffer
 * @param {Array} buf use buf.jain('') to get out sanitized html string
 * @returns {object} in the form of {
 *     start: function(tag, attrs, unary) {},
 *     end: function(tag) {},
 *     chars: function(text) {},
 *     comment: function(text) {}
 * }
 */
function htmlSanitizeWriter(buf){
  var ignore = false;
  var out = angular.bind(buf, buf.push);
  return {
    start: function(tag, attrs, unary){
      tag = angular.lowercase(tag);
      if (!ignore && specialElements[tag]) {
        ignore = tag;
      }
      if (!ignore && validElements[tag] === true) {
        out('<');
        out(tag);
        angular.forEach(attrs, function(value, key){
          var lkey=angular.lowercase(key);
          if (validAttrs[lkey]===true && (uriAttrs[lkey]!==true || value.match(URI_REGEXP))) {
            out(' ');
            out(key);
            out('="');
            out(encodeEntities(value));
            out('"');
          }
        });
        out(unary ? '/>' : '>');
      }
    },
    end: function(tag){
        tag = angular.lowercase(tag);
        if (!ignore && validElements[tag] === true) {
          out('</');
          out(tag);
          out('>');
        }
        if (tag == ignore) {
          ignore = false;
        }
      },
    chars: function(chars){
        if (!ignore) {
          out(encodeEntities(chars));
        }
      }
  };
}


// define ngSanitize module and register $sanitize service
angular.module('ngSanitize', []).value('$sanitize', $sanitize);

//     Underscore.js 1.5.2
//     http://underscorejs.org
//     (c) 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `exports` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    concat           = ArrayProto.concat,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.5.2';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, length = obj.length; i < length; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      var keys = _.keys(obj);
      for (var i = 0, length = keys.length; i < length; i++) {
        if (iterator.call(context, obj[keys[i]], keys[i], obj) === breaker) return;
      }
    }
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results.push(iterator.call(context, value, index, list));
    });
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var length = obj.length;
    if (length !== +length) {
      var keys = _.keys(obj);
      length = keys.length;
    }
    each(obj, function(value, index, list) {
      index = keys ? keys[--length] : --length;
      if (!initial) {
        memo = obj[index];
        initial = true;
      } else {
        memo = iterator.call(context, memo, obj[index], index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, iterator, context) {
    var result;
    any(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
    each(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) results.push(value);
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, iterator, context) {
    return _.filter(obj, function(value, index, list) {
      return !iterator.call(context, value, index, list);
    }, context);
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
    each(obj, function(value, index, list) {
      if (!(result = result && iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
    each(obj, function(value, index, list) {
      if (result || (result = iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    return any(obj, function(value) {
      return value === target;
    });
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      return (isFunc ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, function(value){ return value[key]; });
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs, first) {
    if (_.isEmpty(attrs)) return first ? void 0 : [];
    return _[first ? 'find' : 'filter'](obj, function(value) {
      for (var key in attrs) {
        if (attrs[key] !== value[key]) return false;
      }
      return true;
    });
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.where(obj, attrs, true);
  };

  // Return the maximum element or (element-based computation).
  // Can't optimize arrays of integers longer than 65,535 elements.
  // See [WebKit Bug 80797](https://bugs.webkit.org/show_bug.cgi?id=80797)
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return -Infinity;
    var result = {computed : -Infinity, value: -Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed > result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.min.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return Infinity;
    var result = {computed : Infinity, value: Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed < result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Shuffle an array, using the modern version of the 
  // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisherâ€“Yates_shuffle).
  _.shuffle = function(obj) {
    var rand;
    var index = 0;
    var shuffled = [];
    each(obj, function(value) {
      rand = _.random(index++);
      shuffled[index - 1] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // Sample **n** random values from an array.
  // If **n** is not specified, returns a single random element from the array.
  // The internal `guard` argument allows it to work with `map`.
  _.sample = function(obj, n, guard) {
    if (arguments.length < 2 || guard) {
      return obj[_.random(obj.length - 1)];
    }
    return _.shuffle(obj).slice(0, Math.max(0, n));
  };

  // An internal function to generate lookup iterators.
  var lookupIterator = function(value) {
    return _.isFunction(value) ? value : function(obj){ return obj[value]; };
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, value, context) {
    var iterator = lookupIterator(value);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value: value,
        index: index,
        criteria: iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(behavior) {
    return function(obj, value, context) {
      var result = {};
      var iterator = value == null ? _.identity : lookupIterator(value);
      each(obj, function(value, index) {
        var key = iterator.call(context, value, index, obj);
        behavior(result, key, value);
      });
      return result;
    };
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = group(function(result, key, value) {
    (_.has(result, key) ? result[key] : (result[key] = [])).push(value);
  });

  // Indexes the object's values by a criterion, similar to `groupBy`, but for
  // when you know that your index values will be unique.
  _.indexBy = group(function(result, key, value) {
    result[key] = value;
  });

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = group(function(result, key) {
    _.has(result, key) ? result[key]++ : result[key] = 1;
  });

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = iterator == null ? _.identity : lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >>> 1;
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely create a real, live array from anything iterable.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (obj.length === +obj.length) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    return (n == null) || guard ? array[0] : slice.call(array, 0, n);
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n == null) || guard) {
      return array[array.length - 1];
    } else {
      return slice.call(array, Math.max(array.length - n, 0));
    }
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, (n == null) || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, output) {
    if (shallow && _.every(input, _.isArray)) {
      return concat.apply(output, input);
    }
    each(input, function(value) {
      if (_.isArray(value) || _.isArguments(value)) {
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  };

  // Flatten out an array, either recursively (by default), or just one level.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator, context) {
    if (_.isFunction(isSorted)) {
      context = iterator;
      iterator = isSorted;
      isSorted = false;
    }
    var initial = iterator ? _.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(_.flatten(arguments, true));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.indexOf(other, item) >= 0;
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.contains(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var length = _.max(_.pluck(arguments, "length").concat(0));
    var results = new Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(arguments, '' + i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, length = list.length; i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, length = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = (isSorted < 0 ? Math.max(0, length + isSorted) : isSorted);
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
    for (; i < length; i++) if (array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var hasIndex = from != null;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(length);

    while(idx < length) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Reusable constructor function for prototype setting.
  var ctor = function(){};

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    var args, bound;
    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError;
    args = slice.call(arguments, 2);
    return bound = function() {
      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
      ctor.prototype = func.prototype;
      var self = new ctor;
      ctor.prototype = null;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (Object(result) === result) return result;
      return self;
    };
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context.
  _.partial = function(func) {
    var args = slice.call(arguments, 1);
    return function() {
      return func.apply(this, args.concat(slice.call(arguments)));
    };
  };

  // Bind all of an object's methods to that object. Useful for ensuring that
  // all callbacks defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length === 0) throw new Error("bindAll must be passed function names");
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    options || (options = {});
    var later = function() {
      previous = options.leading === false ? 0 : new Date;
      timeout = null;
      result = func.apply(context, args);
    };
    return function() {
      var now = new Date;
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, args, context, timestamp, result;
    return function() {
      context = this;
      args = arguments;
      timestamp = new Date();
      var later = function() {
        var last = (new Date()) - timestamp;
        if (last < wait) {
          timeout = setTimeout(later, wait - last);
        } else {
          timeout = null;
          if (!immediate) result = func.apply(context, args);
        }
      };
      var callNow = immediate && !timeout;
      if (!timeout) {
        timeout = setTimeout(later, wait);
      }
      if (callNow) result = func.apply(context, args);
      return result;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return function() {
      var args = [func];
      push.apply(args, arguments);
      return wrapper.apply(this, args);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = nativeKeys || function(obj) {
    if (obj !== Object(obj)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = new Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var pairs = new Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    each(keys, function(key) {
      if (key in obj) copy[key] = obj[key];
    });
    return copy;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    for (var key in obj) {
      if (!_.contains(keys, key)) copy[key] = obj[key];
    }
    return copy;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] === void 0) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] == a) return bStack[length] == b;
    }
    // Objects with different constructors are not equivalent, but `Object`s
    // from different frames are.
    var aCtor = a.constructor, bCtor = b.constructor;
    if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                             _.isFunction(bCtor) && (bCtor instanceof bCtor))) {
      return false;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Optimize `isFunction` if appropriate.
  if (typeof (/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  // Run a function **n** times.
  _.times = function(n, iterator, context) {
    var accum = Array(Math.max(0, n));
    for (var i = 0; i < n; i++) accum[i] = iterator.call(context, i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // List of HTML entities for escaping.
  var entityMap = {
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;'
    }
  };
  entityMap.unescape = _.invert(entityMap.escape);

  // Regexes containing the keys and values listed immediately above.
  var entityRegexes = {
    escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      return ('' + string).replace(entityRegexes[method], function(match) {
        return entityMap[method][match];
      });
    };
  });

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return void 0;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    var render;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      }
      if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      }
      if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }
      index = offset + match.length;
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
      render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  _.extend(_.prototype, {

    // Start chaining a wrapped Underscore object.
    chain: function() {
      this._chain = true;
      return this;
    },

    // Extracts the result from a wrapped and chained object.
    value: function() {
      return this._wrapped;
    }

  });

}).call(this);