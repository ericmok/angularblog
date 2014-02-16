
angular.module("main", [
    'filters.moment',
	'ui.router', 
	'Security', 
    'RegisterForm',
	'LoginForm', 
	'Urls', 
	'AjaxCaching', 
	'Endpoints',
	'UniqueSource',
    'PostParentDirective',
    'Crypto'])

.config(function($stateProvider, $urlRouterProvider) {

	$urlRouterProvider.otherwise('/');

	$stateProvider
		.state('latest', {
			url: '/',
			templateUrl: '/static/blog/dist/app/latest/latest.tpl.html'
		})
        .state('error404', {
            url: '/error',
            templateUrl: '/static/blog/dist/app/error404/error404.tpl.html'
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
		.state('createpost', {
			url: '/blog/:blogId/createpost',
			templateUrl: '/static/blog/dist/app/createpost/createpost.tpl.html'
		})
		.state('post', {
			url: '/post/:postId',
			templateUrl: '/static/blog/dist/app/post/post.tpl.html'
		})
		.state('revisepost', {
			url: '/post/:postId/revise',
			templateUrl: '/static/blog/dist/app/revisepost/revisepost.tpl.html'
		})
        .state('revisions', {
            url: '/revisions/:postId',
            templateUrl: '/static/blog/dist/app/revisions/revisions.tpl.html'
        })
        .state('revisions.editions', { // TODO: Change to .editions
            url: '/:editionId',
            templateUrl: '/static/blog/dist/app/revisions/revisions.editions.tpl.html'
        });
})

.controller('NavCtrl', function($scope, BlogsEndpoint) {
    $scope.blogs = [];
    
    BlogsEndpoint.fetchAll().then(function (collection) {
        $scope.blogs = collection;
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
		},
		deleteURL: function(url) {
			for (var i = 0; i < urlCache.length; i++) {
				if (urlCache[i].url == url) {
					urlCache.splice(i, 1);
				}
			}
		}
	};

})

.factory('RequestCache', ["$http", "$q", "UrlCache", function($http, $q, UrlCache) {
    /*
     TODO: getURL should return the response instead of the data?
     */
	return {
		invalidateURL: function(url) {
			UrlCache.deleteURL(url);
		},
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

angular.module('Crypto',[])

.factory('md5', function() {
    return {
        md5: function(val) {
            return CryptoJS.MD5(val);
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
		invalidate: function(id) {
			RequestCache.invalidateURL(urls.blogs + '/' + id);
		},
		fetch: function(id, fresh) {
			var self = this;

			if (fresh) {
				this.invalidate(id);
			}

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
        
        constructParentURL: function(post) {
            
            if (arguments.length == 2) {
                var post = {
                    parent_content_type: arguments[0],
                    parent_id: arguments[1]
                };
            }
                
            if (post.parent_content_type === 'blog') {
                return urls.blogs + '/' + post.parent_id;
            }
            if (post.parent_content_type === 'post') {
                return urls.posts + '/' + post.parent_id;
            }
            if (post.parent_content_type === 'paragraph') {
                return urls.paragraphs + '/' + post.parent_id;
            }
            if (post.parent_content_type === 'sentence') {
                return urls.sentences + '/' + post.parent_id;
            }
            throw "Post Endpoing construct fail. You should be passing in a Post object as a param?"
            return null;
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
			
            var self = this;
            
            return RequestCache.getURL(urls.posts + '/' + id).then(function(data) {
				
                // The server-generated parent_repr field replaces this functionality for now...
				// Loads the parent object into the parent field
//                return RequestCache.getURL(self.constructParentURL(data.parent_content_type, data.parent_id)).then(function(parent) {
//					data.parent = parent;
//					return data;
//				});
                return data;
			});
        },
        
		fetchAll: function(page) {
			if (!page) {
				page = 1;
			}
			return RequestCache.getURL(urls.posts + '?page=' + page);
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

.factory('SentencesEndpoint', function(RequestCache, urls, $q) {
	return {
        fetch: function(id) {
            return RequestCache.getURL(urls.sentences + '/' + id);
        },
        getPreviousVersion: function(sentence) {
        	if (sentence.previous_version === null) {
        		var deferred = $q.defer();
        		deferred.reject('Sentence has no previous version');
        		return deferred.promise;
        	}
            return RequestCache.getURL(urls.sentences + '/' + sentence.previous_version);
        }
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

angular.module('Serializers', []).

factory('Blog', function() {
    return function(data) {
        this.id = data.id;
        this.title = data.title;
        this.description = data.description;
    };
});

 /* *** */ 

angular.module('Urls', [])

.constant('urls', {
	tokens: "/api-tokens",
	users: "/api/users",
	blogs: "/api/blogs",
	posts: "/api/posts",
    editions: "/api/editions",
    paragraphs: "/api/paragraphs",
	sentences: "/api/sentences"
});


 /* *** */ 

angular.module('LoginForm', ['Security', 'UniqueSource', 'RegisterForm'])


.directive('loginForm', function($compile, $timeout, urls, auth) {
	
	return {
		restrict: 'EA', 
		template: '<div class=\'login-form\'><div class=\'inner-login-form\'></div><div ng-if=\"isLoggedIn()\" ng-transclude></div></div>',
		replace: true,
		transclude: true,
		scope: {},
		controller: function($scope) {
            $scope.isRegistering = false;
            
            $scope.switchToRegisterForm = function() {
                $scope.isRegistering = true;
            };
            
            $scope.switchToLoginForm = function(username, password) {
            	console.log('switch:', username, password);
            	if (username) {
            		$scope.username = username;
            		$scope.password = password;
            		$scope.login();
            	}
                $scope.isRegistering = false;
            };

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
			
			// For template to use
			$scope.isLoggedIn = function() {
				return auth.isLoggedIn();	
			};
			
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


			var loginRoot = angular.element("<div class='login'></div>");
            
			var loginFormElement = angular.element('<form class="inner-login-form" ng-show="!isRegistering" ng-submit="login()"></form>');
			var loginHeaderElement = angular.element('');
		
			var alertElement = angular.element('<div class="alert alert-danger" ng-show="failure" ng-bind="status"></div>');
		
			var usernameElement = angular.element('<input class="form-control" type="text" ng-model="username" name="username" placeholder="username" />');
		
			var passwordElement = angular.element('<input class="form-control" ng-model="password" type="password" name="password" placeholder="password" />');
		
			var loginButtonElement = angular.element('<input type="submit" class="btn btn-login" value="Log In" ng-class="{loading: busy}" />');
            
			var clearElement = angular.element('<div style="clear: both"></div>');
            		
			var logoutRoot = angular.element('<div class="logout"></div>');
			var logoutUserInfoElement = angular.element('<div class="user-info"><p class="user-info-username">{{username}}</p></div>')
			var logoutButtonElement = angular.element('<input type="button" ng-click="logout()" class="col-xs-6 btn btn-logout" value="Log Out" />')
			var logoutClearElement = angular.element('<div style=\'clear:both;\'></div>');

            var registerLink = angular.element('<a ng-show="!isRegistering" ng-click="switchToRegisterForm()">or click here to create account</a>');
            var registerForm = angular.element('<div ng-hide="!isRegistering"><register-form success="switchToLoginForm(username, password)"></register-form><a ng-click="switchToLoginForm()">Already have an account? Click here to login.</a></div>');
            
			// Login elements
			loginFormElement.append(loginHeaderElement);

			loginFormElement.append(alertElement);

			loginFormElement.append(usernameElement);
			loginFormElement.append(passwordElement);
			loginFormElement.append(loginButtonElement);

			loginFormElement.append(clearElement);

			loginRoot.append(loginFormElement);
            
            loginRoot.append(registerLink);
            loginRoot.append(registerForm);
			
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
				
				var inclusionRoot = element.children('.inner-login-form').first();
				if (val == true) {					
					inclusionRoot.empty();
					inclusionRoot.append($compile(logoutRoot)(scope));
					//element.empty(); 
					//element.append($compile(logoutRoot)(scope));
				}
				else {
					inclusionRoot.empty();
					inclusionRoot.append($compile(loginRoot)(scope));
					//element.empty();
					//element.append($compile(loginRoot)(scope));
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

angular.module('PasswordConfirm', [])

.directive('passwordConfirm', function() {
	return {
		require: 'ngModel',
		restrict: 'A',
		scope: {
			equals: '@'
		}, 
		link: function(scope, element, attrs, ngModelCtrl) {

			scope.validate = function() {
				console.log('equals', attrs);
				if (attrs['equals'] === '') {
					ngModelCtrl.$setValidity('confirmed', true);
				}

				if (ngModelCtrl.$viewValue === attrs['equals']) {
					ngModelCtrl.$setValidity('confirmed', true);
				} else {
					ngModelCtrl.$setValidity('confirmed', false);
				}
			};

			scope.$watch(function() {
				return ngModelCtrl.$modelValue;
			}, function(newVal) {
				scope.validate();
			});

			attrs.$observe('equals', function(val) {
				scope.validate();
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

angular.module('PostParentDirective', ['ui.router', 'Endpoints'])

.directive('postParent', function($compile) {
    return {
        restrict: 'EA',
        template: '<div ng-transclude></div>',
        replace: true,
        transclude: true,
        scope: {
            parentContentType: '=',
            parentId: '=',
            parentRepr: '='
        },
        controller: function($scope, $state, SentencesEndpoint) {
            
            if ($scope.parentContentType === 'blog') {
                
                $scope.sref = $state.href('blog', {blogId: $scope.parentRepr});
                $scope.representation = $scope.parentRepr;   
                
            } else if ($scope.parentContentType === 'post') {
                
                $scope.sref = $state.href('post', {postId: $scope.parentId});
                $scope.representation = $scope.parentRepr;
                
            } else if ($scope.parentContentType === 'paragraph') {
                
                $scope.sref = 'latest';
                $scope.representation = $scope.parentRepr;
                
            } else if ($scope.parentContentType == 'sentence') {
                
                SentencesEndpoint.fetch($scope.parentId).then(function(data) {
                    var loc = $state.href('post', { postId: data.post }) + '?sentence=' + $scope.parentId;
                    $scope.sref = loc;
                });
                
                $scope.representation = $scope.parentRepr;
            }

            this.getParentContentType = function() {
                return $scope.parentContentType;
            };
            
            this.getLink = function() {
                return $scope.sref;
            };
        },
        link: function(scope, element, attrs) {

//            scope.$watch(function() {
//                return scope.sref;
//            }, function(val) {
//                 var el = $compile(scope.anchor)(scope);
//                el.attr('href', val);
//                el.empty();
//                el.append( $compile(angular.element('<p>{{scope.representation}}</p>'))(scope) );
//
//                console.log('el:', el);
//
//                element.append(el); 
//            });
        }
    };
    
}).

directive('blogTemplate', function() {
    return {
        restrict: 'EA',
        template: '<div ng-if="isActive"><div ng-transclude></div></div>',
        replace: true,
        transclude: true,
        require: '^postParent',
        controller: function($scope) {
        },
        link: function(scope, element, attrs, postParentCtrl) {
            scope.$watch(function() {
                return postParentCtrl.parentContentType;
            }, function(val) {
               if (postParentCtrl.parentContentType === 'blog') {
                   scope.isActive = true;
                } 
            });
        }
    };
}).

directive('postTemplate', function() {
    return {
        restrict: 'EA',
        template: '<div ng-if="isActive"><div ng-transclude></div></div>',
        replace: true,
        transclude: true,
        require: '^postParent',
        controller: function($scope) {
        },
        link: function(scope, element, attrs, postParentCtrl) {
            scope.$watch(function() {
                return postParentCtrl.parentContentType;
            }, function(val) {
               if (postParentCtrl.parentContentType === 'post') {
                   scope.isActive = true;
                } 
            });
        }
    };
}).

directive('paragraphTemplate', function() {
    return {
        restrict: 'EA',
        template: '<div ng-if="isActive"><div ng-transclude></div></div>',
        replace: true,
        transclude: true,
        require: '^postParent',
        controller: function($scope) {
        },
        link: function(scope, element, attrs, postParentCtrl) {
            scope.$watch(function() {
                return postParentCtrl.parentContentType;
            }, function(val) {
               if (postParentCtrl.parentContentType === 'paragraph') {
                   scope.isActive = true;
                } 
            });
        }
    };
}).

directive('sentenceTemplate', function($compile) {
    return {
        require: '^postParent',
        restrict: 'EA',
        template: '<div><div ng-if="isSentence == true"><div ng-transclude></div></div></div>',
        transclude: true,
        replace: true,
        controller: function($scope) {
            $scope.isSentence = false;
            $scope.sref = 'test';
            
            this.goToParent = function() {
                console.log('go to parent');
            };
        },
        link: function(scope, element, attrs, postParentCtrl) {
                
                if (postParentCtrl.getParentContentType() === 'sentence') {
                    scope.isSentence = true;
                    
                    scope.$watch(function() {
                        postParentCtrl.getLink();
                    }, function(val) {
                        scope.sref = val;
                    });
                } 

        }
    };
})

.directive('genericPointer', function() {
})

.directive('referenceModel', function($state, SentencesEndpoint) {
    
    /*
    Sets the href attribute to point to a page on the site that can display the model
    */
    return {
        scope: {
            parentContentType: '@',
            parentId: '@'
        },
        controller: function($scope) {
            $scope.link = '#';
            $scope.parentContentType = null;
            $scope.parentId = null;
            
            $scope.setParentContentType = function(val) {
                $scope.parentContentType = val;
                if ($scope.parentId !== null) {
                    $scope.doWork();
                }
            };
            
            $scope.setParentId = function(val) {
                $scope.parentId = val;
                if ($scope.parentContentType !== null) {
                    $scope.doWork();
                }
            };
            
            $scope.doWork = function() {
                switch ($scope.parentContentType) {
                    case 'blog':
                        $scope.link = $state.href('blog', {blogId: $scope.parentId});
                        $scope.render();
                        break;
                    case 'post':
                        $scope.link = $state.href('post', {postId: $scope.parentId});
                        $scope.render();
                        break;
                    case 'paragraph':
                        console.error('Paragraph links not implemented');
                        break;
                    case 'sentence':
                        SentencesEndpoint.fetch($scope.parentId).then(function(sentence) {
                            $scope.link = $state.href('post', {postId: sentence.post}) + '?sentence=' + sentence.id;
                            $scope.render();
                        });
                        break;
                };
            };
        },
        link: function(scope, element, attrs) {
            attrs.$observe('parentContentType', function(val) {
                scope.setParentContentType(val);
            });
            attrs.$observe('parentId', function(val) {
                scope.setParentId(val);
            });
            
            scope.render = function() { 
                element.attr('href', scope.link);    
            };
        }
    };
});


 /* *** */ 

angular.module('RegisterForm', ['UniqueSource', 'Urls', 'Crypto', 'Security', 'PasswordConfirm'])

.directive('registerForm', function(urls) {
    return {
        restrict: 'EA',
        template: 
            '<form name="registerForm" ng-submit="createAccount()" class="register-form">' +
                '<h3>Register</h3>' +
                '<input type="text" name="username" ng-model="username" ng-minlength="4" ng-pattern="/^[a-zA-Z0-9]*$/" ng-required unique-source="' + 
                urls.users + 
                '"loading="usernameValidationLoading()" finished="usernameValidationFinished()" class="form-control" placeholder="Enter a unique username" />' +
                '<input type="password" name="password" ng-model="password" class="form-control" ng-minlength="5" ng-required placeholder="Enter a password..." />' +
                '<input type="password" name="passwordConfirm" ng-model="passwordConfirm" class="form-control" password-confirm equals="{{password}}" placeholder="Type your password a second time..." />' +
                '<div style="clear: both;"></div>' +
                '<div ng-if="registerForm.username.$error.pattern" class="alert alert-danger">Username should only be alphanumeric with no spaces</div>' +
                '<div ng-if="registerForm.username.$error.minlength" class="alert alert-danger">Username needs to be at least 4 characters long</div>' +
                '<div ng-if="registerForm.username.$error.uniqueSource" class="alert alert-danger">That username is already taken!</div>' +
                '<div ng-if="registerForm.password.$error.minlength" class="alert alert-danger">That password is too short!</div>' +
                '<div ng-if="registerForm.passwordConfirm.$error.confirmed" class="alert alert-danger">The 2 passwords are not the same!</div>' +
                '<div ng-if="attemptFail" class="alert alert-danger">Could not create this username...</div>' +
                '<div style="clear: both;"></div>' +
                '<div ng-if="calculating"><img src=\"/static/blog/assets/ajax-loader.gif\" /></div>' +
                '<button class="btn btn-success" ng-hide="calculating">Create Account</button>' +
            '</form>',
        scope: {
            success: '&'
        },
        controller: function($scope, $http, urls, md5, auth) {
            $scope.username = '';
            $scope.password = '';

            $scope.attemptFail = false;

            $scope.calculating = false;

            $scope.usernameValidationLoading = function() {
                $scope.calculating = true;
            };
            $scope.usernameValidationFinished = function() {
                $scope.calculating = false;
            };

//            $scope.isValid = function(formCtrl) {
//                for (var item in formCtrl.username.$error) {
//                    if (formCtrl.username.$error.hasOwnProperty(item) {
//                        if (formCtrl.username.$error[item] === true) {
//                            return false;
//                        }
//                    }
//                }
//                for (var item in formCtrl.password.$error) {
//                    if (formCtrl.password.$error.hasOwnProperty(item) {
//                        if (formCtrl.password.$error[item] === true) {
//                            return false;
//                        }
//                    }
//                }
//                return true;
//            };
            
            $scope.hashCash = function() {
                
                var counter = 0;
                var hash = 'aa';
                
                while (true) {
                    counter++;
                    
                    hash = [$scope.username, counter].join('');
                    hash = md5.md5(hash).toString();
                    //console.log('hash', hash);
                    //console.log(hash.charAt(0), hash.charAt(1));
                    
                    if ((hash.charAt(0) === '0') && (hash.charAt(1) === '0') && (hash.charAt(2) === '0')) {
                        
                        return {
                            counter: counter,
                            hash: hash
                        };
                    }
                }
            };
            
            $scope.createAccount = function() {
                
                $scope.calculating = true;
                var hashCash = $scope.hashCash();
                
                $http({
                    method: 'POST',
                    url: urls.users,
                    data: {
                        username: $scope.username,
                        password: $scope.password
                    },
                    headers: {
                        unique: 'username ' + hashCash.counter + ' ' + hashCash.hash
                    }
                }).then(function(data) {
                    $scope.success();
                    $scope.calculating = false;
                    console.log('Create user success');
                    $scope.success({username: $scope.username, password: $scope.password});
                }, function() {
                    $scope.calculating = false;
                    $scope.attemptFail = true;
                    console.log('Create user fail');
                });
            };
        },
        link: function(scope, element, attrs) {
        
        }
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

angular.module('UniqueSource', [])

.directive('uniqueSource', function($http, $timeout) {
	return {
		require: 'ngModel',
		restrict: 'A',
        scope: {
            'uniqueSource': '@',
            'loading': '&',
            'finished': '&'
        },
		controller: function($scope) {
            $scope.urlParam = null; // Wait for attribute to link
            
			$scope.delayTimer = null;
			$scope.DELAY = 800;

			$scope.data = '';

			$scope.validating = false;

			$scope.startValidation = function() {
                
                // If the urlParam hasn't been bootstrapped, then skip!
                if ($scope.urlParam === null) {
                    return;
                }
                
				$timeout.cancel($scope.delayTimer);

				$scope.delayTimer = $timeout(function() {
					$scope.validating = true;

					$scope.loading();

					console.log("ping!", $scope.data);

					if ($scope.data.length < 1) {
						$scope.delayTimer = null;
						return;
					}
                    
                    console.log('ping goes to [', $scope.urlParam, ' ]');
					$http.get($scope.urlParam + "/" + $scope.data).success(function(data) { 

						//console.log("success", data);
                        console.log("uniqueness test fails");
						$scope.ngModelCtrl.$setValidity('uniqueSource', false);
						$scope.delayTimer = null;
						$scope.validating = false;

						$scope.finished();

					}).error(function(data) {

						//console.log("fail", data);
                        console.log("uniqueness test succeeds");
						$scope.ngModelCtrl.$setValidity('uniqueSource', true);
						$scope.delayTimer = null;
						$scope.validating = false;

						$scope.finished();

					});
				}, $scope.DELAY);
			};
		},
		link: function(scope, element, attrs, ngModelCtrl) {
            
            attrs.$observe('uniqueSource', function(val) {
                scope.urlParam = val;
            });
            
			scope.ngModelCtrl = ngModelCtrl;

			element.on('keyup', function(ev) {
				scope.data = ngModelCtrl.$viewValue;
				scope.startValidation();
			});
		}
	};
})


 /* *** */ 



 /* *** */ 

angular.module('filters.moment', []).

filter('moment', function() {
    return function(date) {
        return moment(date).fromNow();
    };
}).

filter('momentverbose', function() {
    return function(date) {
        return moment(date).format('LLLL');
    };
});