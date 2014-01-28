angular.module("main", ['ui.router', 'RestModule', 'Security', 'LoginForm'])

.config(function($stateProvider, $urlRouterProvider) {

	$urlRouterProvider.otherwise('/latest');

	$stateProvider
		.state('latest', {
			url: '/latest',
			templateUrl: '/static/blog/dist/app/latest/latest.tpl.html'
		});
});

 /* *** */ 

angular.module("RestModule", [])

.factory("ModelCache", function() {
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

.factory('ModelCacheAjax', ["$http", "$q", "ModelCache", function($http, $q, ModelCache) {
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
}])

.factory('Api', ["$http", "$q", "ModelCacheAjax", function($http, $q, ModelCacheAjax) {

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

angular.module('Security', [])

.constant('urls', {
	token: "http://localhost:8000/blog/api-tokens",
	user: "http://localhost:8000/blog/api/users"
})

.factory('auth', function($window, $http, urls) {

	return {
		loginToken: null,
		username: null,

		login: function(username, password) {

			var self = this;

			console.log("login");
			var promise = $http({
				method: "POST",
				url: urls.token,
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
				self.loginToken = data.token;

				// return $http.get(urls.user + "/" + username).then(fnugction(response) {
				// 	self.user = response.data;
				// 	console.log("logged in");
				// });
			});

			promise.error(function(data, status, headers, config) {
				$window.sessionStorage.setItem("token", null);
				self.loginToken = null;
				self.username = null;
			});

			return promise;
		},
		isLoggedIn: function() {
			return this.loginToken != null;
		},

		logout: function() {

			var self = this;

			$window.sessionStorage.removeItem("token");
			$window.sessionStorage.removeItem("username");

			var tempLoginToken = self.loginToken;
			
			self.loginToken = null;
			self.username = null;

			return $http({
				url: urls.token,
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

			var promise = $http.post(urls.user, {username: username, password: password});

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
	auth.username = $window.sessionStorage.getItem("username");
});

 /* *** */ 

angular.module('LoginForm', ['Security'])


.directive('loginForm', function($compile, auth) {

	var root = angular.element("<div></div>");

	var loginFormElement = angular.element('<form class="login-form" ng-submit="login()"></form>');
	var loginHeaderElement = angular.element('<h3>Login</h3>');

	var alertElement = angular.element('<div class="alert alert-danger" ng-show="failure" ng-bind="status"></div>');

	var usernameElement = angular.element('<input class="form-control" type="text" ng-model="username" name="username" placeholder="username" />');

	var passwordElement = angular.element('<input class="form-control" ng-model="password" type="password" name="password" placeholder="password" />');
	var loginButtonElement = angular.element('<input type="submit" class="btn btn-primary" value="Log In" />');
	var createAccountElement = angular.element('<button class="btn btn-success" ng-submit="createUser">Create Account</button>');

	var logoutRoot = angular.element('<div></div>');
	var logoutButtonElement = angular.element('<input type="button" ng-click="logout()" class="btn btn-success" value="Log Out" />')

	return {
		restrict: 'EA', 
		template: '<div></div>',
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
			
			$scope.login = function() {
				console.log("Login");
				auth.login($scope.username, $scope.password).then(function (){
					console.log("ACTION");
					$scope.password = "CLEARED";
				}, function() {
					console.log("FAIL");
					$scope.failure = true;
					$scope.status = 'Username or Password Incorrect';
				});
			};

			$scope.logout = function() {
				auth.logout();
			}

			$scope.createUser = function() {
				console.log("create user");
				auth.createUser($scope.username, $scope.password);
			};
		},
		link: function(scope, element, attrs) {

			scope.$watch(function() {
				return auth.isLoggedIn();
			}, function(val) {
				if (val == true) {
					logoutRoot.append($compile(logoutButtonElement)(scope));
					element.empty();
					element.append(logoutRoot);
				}
				else {
					element.empty();
					loginFormElement.append(loginHeaderElement);

					loginFormElement.append(alertElement);

					usernameElement.val('');
					passwordElement.val(''); // Clear the password field !important

					loginFormElement.append(usernameElement);
					loginFormElement.append(passwordElement);
					loginFormElement.append(loginButtonElement);

					root.append(loginFormElement);

					element.append(
						$compile(root)(scope)
					);
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