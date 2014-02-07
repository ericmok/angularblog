
angular.module("main", [
	'ui.router', 
	'Security', 
	'LoginForm', 
	'Urls', 
	'AjaxCaching', 
	'Endpoints',
	'UniqueInput'])

.provider('urlConstructor', function UrlConstructorProvider() {
	/**
	Used for constructing client app urls - different from restful endpoint urls

	Nicer if we can parse the URL segments, and automatically generate these functions!
	*/
	this.mapping = {}; // state -> function

	this.register = function(state, func) {
		this.mapping[state] = func;
	};	

	this.$get = function UrlConstructorFactory() {

		return this.mapping;

		// return new function() {
		// 	this.latest = function() {
		// 		return '/latest';
		// 	};
		// 	this.createblog = function() {
		// 		return '/createblog'
		// 	};
		// 	this.blog = function(id) {
		// 		return '/blog/' + id;
		// 	};
		// 	this.editblog = function(id) {
		// 		return '/blog/' + id + '/edit';
		// 	};
		// 	this.post = function(id) {
		// 		return '/post/' + id;
		// 	};
		// 	this.createpost = function(id) {
		// 		return '/blog/' + id + '/createpost';
		// 	};
		// };
	};
})

.config(function($stateProvider, $urlRouterProvider, urlConstructorProvider) {

	$urlRouterProvider.otherwise('/latest');

	$stateProvider
		.state('latest', {
			url: '/latest',
			templateUrl: '/static/blog/dist/app/latest/latest.tpl.html'
		})
		.state('createblog', {
			url: '/createblog',
			templateUrl: '/static/blog/dist/app/createblog/createblog.tpl.html'
		})
		.state('blog', {
			url: '/blog/:blogId',
			templateUrl: '/static/blog/dist/app/blog/blog.tpl.html'
		})
		.state('editblog', {
			url: '/blog/:blogId/edit',
			templateUrl: '/static/blog/dist/app/editblog/editblog.tpl.html'
		})
		.state('post', {
			url: '/post/:postId',
			templateUrl: '/static/blog/dist/app/post/post.tpl.html'
		})
		.state('createpost', {
			url: '/blog/:blogId/createpost', 
			templateUrl: '/static/blog/dist/app/createpost/createpost.tpl.html'
		});

	urlConstructorProvider.register('latest', function() {
		return '/latest';
	});
	urlConstructorProvider.register('createblog', function() {
		return '/createblog';
	});
	urlConstructorProvider.register('blog', function(id) {
		return '/blog/' + id;
	})
	urlConstructorProvider.register('editblog', function(id) {
		return '/blog/' + id + '/edit';
	});
	urlConstructorProvider.register('post', function(id) {
		return '/post/' + id;
	});
	urlConstructorProvider.register('createpost', function(id) {
		return '/blog/' + id + '/createpost';
	});
});


 /* *** */ 


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



 /* *** */ 

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

		create: function(content_type, id, title, content) {
			return $http({
				url: urls.posts,
				method: 'POST',
				data: {
					parent_content_type: 'blog',
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
		}
	};
})

.factory('SentencesEndpoint', function() {
	return {

	};
});

 /* *** */ 

angular.module('ModelCache', ['AjaxCaching'])

.factory('ModelCache', function() {
	return {
		blogs: [],
		posts: [],
		sentences: []
	};
});

 /* *** */ 

angular.module('Security', ['Urls'])

.factory('auth', function($window, $http, urls) {

	return {
		loginToken: null,
		username: null,
		tokenDate: 0,
		TOKEN_LIFE_TIME: (2 * 60 * 60 * 1000), // 2 hours
		
		login: function(username, password) {

			var self = this;

			console.log("auth.login");

			var promise = $http({
				method: "POST",
				url: urls.tokens,
				data: {
					username: username, 
					password: password
				},
				headers: {
					"X-CSRFToken": self.getCSRFToken()
				}
			});

			promise.success(function (data, status, headers, config) {

				$window.sessionStorage.setItem("token", data.token);
				$window.sessionStorage.setItem("username", username);
				
				self.tokenDate = (new Date()).getTime();
				$window.sessionStorage.setItem("token_date", self.tokenDate);

				self.loginToken = data.token;
				self.username = username;
				// return $http.get(urls.users + "/" + username).then(fnugction(response) {
				// 	self.user = response.data;
				// 	console.log("logged in");
				// });
			});

			promise.error(function(data, status, headers, config) {

				$window.sessionStorage.removeItem("token");
				self.loginToken = null;
				self.username = null;
				self.tokenDate = 0;
			});

			return promise;
		},
		isLoggedIn: function() {
			// On login query, check if token still valid, if not, reset everything
			var lifeTime = this.TOKEN_LIFE_TIME;

			if ( (new Date()).getTime() > this.tokenDate + lifeTime ) {
				this.loginToken = null;
				this.username = null;
				this.tokenDate = 0;
				return false;
			}
			return this.loginToken !== null;
		},

		logout: function() {

			var self = this;

			$window.sessionStorage.removeItem("token");
			$window.sessionStorage.removeItem("token_date");
			$window.sessionStorage.removeItem("username");

			// Store the token in a private variable so it doesn't leak
			var tempLoginToken = self.loginToken;
			
			// Reset all the things
			self.loginToken = null;
			self.tokenDate = 0;
			self.username = null;

			return $http({
				url: urls.tokens,
				method: "DELETE",
				headers: {
					"X-Authorization": tempLoginToken,
					"X-CSRFToken": self.getCSRFToken()
				}
			}).error(function () {
				console.log("Error");
			});
		},
		getCSRFToken: function() {
			var key = 'csrftoken';
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

		getUsername: function() {
			return this.username;
		},

		createUser: function(username, password) {

			var promise = $http.post(urls.users, {username: username, password: password});

			promise.success(function(response) {
				console.log(response.data);
			});

			promise.error(function (response) { 
				console.log(response.data);
			});

			return promise;
		}
	};
})

.run(function($window, auth) {
	auth.loginToken = $window.sessionStorage.getItem("token");
	auth.tokenDate = $window.sessionStorage.getItem("token_date");
	auth.username = $window.sessionStorage.getItem("username");
});



 /* *** */ 

angular.module('Urls', [])

.constant('urls', {
	tokens: "/blog/api-tokens",
	users: "/blog/api/users",
	blogs: "/blog/api/blogs",
	posts: "/blog/api/posts",
	sentences: "/blog/api/sentences"
});


 /* *** */ 

angular.module('LoginForm', ['Security'])


.directive('loginForm', function($compile, $timeout, auth) {

	var loginRoot = angular.element("<div class='login'></div>");

	var loginFormElement = angular.element('<form class="inner-form" ng-submit="login()"></form>');
	var loginHeaderElement = angular.element('');

	var alertElement = angular.element('<div class="alert alert-danger" ng-show="failure" ng-bind="status"></div>');

	var usernameElement = angular.element('<input class="form-control" type="text" ng-model="username" name="username" placeholder="username" />');

	var passwordElement = angular.element('<input class="form-control" ng-model="password" type="password" name="password" placeholder="password" />');

	var loginButtonElement = angular.element('<input type="submit" class="btn btn-login" value="Log In" ng-class="{loading: busy}" />');
	var createAccountElement = angular.element('<button class="btn btn-success" ng-submit="createUser">Create Account</button>');
	var clearElement = angular.element('<div style="clear: both"></div>');

	var logoutRoot = angular.element('<div class="logout"></div>');
	var logoutUserInfoElement = angular.element('<div class="user-info"><p class="user-info-username">{{username}}</p></div>')
	var logoutButtonElement = angular.element('<input type="button" ng-click="logout()" class="col-xs-6 btn btn-logout" value="Log Out" />')
	var logoutClearElement = angular.element('<div style=\'clear:both;\'></div>');

	return {
		restrict: 'EA', 
		template: '<div class=\'login-form\'></div>',
		replace: true,
		scope: {},
		controller: function($scope) {

			if ( auth.isLoggedIn() ) {
				$scope.username = auth.getUsername();
			}
			else {
				$scope.username = '';
			}

			$scope.password = '';
			$scope.failure = false; // Triggered true if log in is with bad credentials
			$scope.status = '';
			$scope.loading = false;
			
			$scope.login = function() {

				$scope.loading = true;

				// Throttle
				$timeout(function() {

					console.log("Login");
					$scope.failure = false;

					auth.login($scope.username, $scope.password).then(function () {
						$scope.password = ""; // Clear from memory
						$scope.loading = false;
					}, function () {
						$scope.failure = true;
						$scope.status = 'Username or Password Incorrect';
						$scope.loading = false;
					});
				}, 400);

			};

			$scope.logout = function() {
				$scope.loading = true;

				auth.logout().then(function() {
					$scope.loading = false;
				}, function() {
					$scope.loading = false;
				});
				$scope.username = "";
				$scope.password = "";
			}

			$scope.createUser = function() {
				console.log("create user");
				auth.createUser($scope.username, $scope.password);
			};
		},
		link: function(scope, element, attrs) {

			// Login elements
			loginFormElement.append(loginHeaderElement);

			loginFormElement.append(alertElement);

			loginFormElement.append(usernameElement);
			loginFormElement.append(passwordElement);
			loginFormElement.append(loginButtonElement);

			loginFormElement.append(clearElement);
			
			loginRoot.append(loginFormElement);
			
			// Logout element
			logoutRoot.append(logoutUserInfoElement);
			logoutRoot.append(logoutButtonElement);
			logoutRoot.append(logoutClearElement);

			// Visual feedback that a login prompt was broadcasted
			scope.flash = function() {
				element.addClass("flash");
				usernameElement.focus();

				$timeout(function() {
					element.removeClass("flash");		
				}, 800);
			};

			// Capture login prompt event that may be broadcasted whenever an action requires a login
			scope.$on('LOGIN_PROMPT', function() {
				scope.flash();
				console.log("FLASH");
			});

			// Depending on state, we show the corresponding element.
			scope.$watch(function() {
				return auth.isLoggedIn();
			}, function(val) {

				if (val == true) {					
					element.empty(); 
					element.append($compile(logoutRoot)(scope));
				}
				else {
					element.empty();
					element.append($compile(loginRoot)(scope));
				}
			});

			scope.$watch(function() {
				return scope.loading;
			}, function(val) {
				if (val == true) {
					loginButtonElement.val("Loading");
				}
				else {
					loginButtonElement.val("Log In");	
				}
			});
		}
	};
});

 /* *** */ 

angular.module('ModelRepresentations', [])

.directive("testElement", function() {
	return {
		restrict: "EA",
		template: "<div>Test</div>",
		replace: true,
		scope: {
		},
		link: function(scope, element, attrs) {

		}	
	};
})

.directive("genericRepresentation", function($http, $compile, $interpolate) {
	var html = "<div>genericRepresentation {{type}}/{{pk}}</div>";

	return {
		restrict: "EA",
		template: "<div></div>",
		replace: true,
		scope: {
			pk: "=",
			type: "="
		},
		controller: function($scope) {
			$scope.model = {};

			$scope.fetchModel = function() {

			}
		},
		link: function(scope, element, attrs) {
			scope.$watch(function() {
				return scope.pk + "," + scope.type;
			}, function(newVal) {
				var compiled_html = $compile(html)(scope);
				element.append( angular.element(compiled_html) );
			});
		}
	};
});

 /* *** */ 

angular.module('PostCreation', ['Security'])

.directive("postInput", function(Security) {
	return {
		restrict: "EA",
		template: "<div><input type='text' /></div>",
		replace: true
	};
});

 /* *** */ 

angular.module('RestrictedPanel', ['Security', 'LoginForm'])

.directive('restrictedPanel', function($compile, auth) {

	return {
		restrict: 'EA',
		template: '<div><div ng-if="isLoggedIn" ng-transclude></div><div ng-if="!isLoggedIn"><login-form></login-form></div></div>',
		replace: true,
		scope: {},
		controller: function($scope) {
			$scope.isLoggedIn = false;
		},
		link: function(scope, element, attrs) {
			scope.$watch(function() {
				return auth.isLoggedIn();
			}, function() {
				if (auth.isLoggedIn()) {
					scope.isLoggedIn = true;
				}
				else {
					scope.isLoggedIn = false;
				}
			});
		}
	};
});

 /* *** */ 

angular.module('main')

.directive('timedTrigger', function($timeout) {

	return {
		restrict: "A",
		scope: {
			timedTrigger: "="
		},
		controller: function($scope) {
			$scope.isSelected = false;
			$scope.mouseOvered = false;

			$scope.timer = null; // Delay before a trigger

			$scope.trigger = function() {
				$scope.isSelected = true;
				$scope.timedTrigger();
			};
		},
		link: function(scope, element, attrs) {

			var self = this;
			scope.timer = null;

			element.on("mouseover", function(ev) {

				scope.timer = $timeout(function() {
					
					scope.trigger();
					scope.timer = null;
				}, 400);

				scope.mouseOvered = true;
				element.addClass('sentence-highlight');

				scope.$digest(); // notify a timer was set

			}).on("mouseout", function(ev) {

				$timeout.cancel(scope.timer);
				scope.timer = null;
				scope.mouseOvered = false;
				element.removeClass('sentence-highlight');

				scope.$digest();
			});
		}
	};
});

 /* *** */ 

angular.module('UniqueInput', [])

.directive('uniqueSource', function($http, $timeout) {
	return {
		require: 'ngModel',
		restrict: 'A',
		controller: function($scope) {
			$scope.delayTimer = null;
			$scope.DELAY = 800;

			$scope.data = '';

			$scope.validating = false;

			$scope.startValidation = function() {
				$timeout.cancel($scope.delayTimer);

				$scope.delayTimer = $timeout(function() {
					$scope.validating = true;

					console.log("ping!", $scope.data);

					if ($scope.data.length < 1) {
						$scope.delayTimer = null;
						return;
					}

					$http.get($scope.source + "/" + $scope.data).success(function(data) { 

						console.log("success", data);
						$scope.ngModelCtrl.$setValidity('uniqueSource', false);
						$scope.delayTimer = null;
						$scope.validating = false;

					}).error(function(data) {

						console.log("fail", data);
						$scope.ngModelCtrl.$setValidity('uniqueSource', true);
						$scope.delayTimer = null;
						$scope.validating = false;
					});
				}, $scope.DELAY);
			};
		},
		link: function(scope, element, attrs, ngModelCtrl) {
			scope.source = attrs.uniqueSource;
			scope.ngModelCtrl = ngModelCtrl;

			element.on('keyup', function(ev) {
				scope.data = ngModelCtrl.$viewValue;
				scope.startValidation();
			});
		}
	};
})


 /* *** */ 

