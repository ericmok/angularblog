angular.module('LoginForm', ['Security'])


.directive('loginForm', function($compile, $timeout, auth) {
	
	return {
		restrict: 'EA', 
		template: '<div class=\'login-form\'><div class=\'inner-login-form\'></div><div ng-if=\"isLoggedIn()\" ng-transclude></div></div>',
		replace: true,
		transclude: true,
		scope: {},
		controller: function($scope) {

			$scope.loginRoot = angular.element("<div class='login'></div>");
		
			$scope.loginFormElement = angular.element('<form class="inner-form" ng-submit="login()"></form>');
			$scope.loginHeaderElement = angular.element('');
		
			$scope.alertElement = angular.element('<div class="alert alert-danger" ng-show="failure" ng-bind="status"></div>');
		
			$scope.usernameElement = angular.element('<input class="form-control" type="text" ng-model="username" name="username" placeholder="username" />');
		
			$scope.passwordElement = angular.element('<input class="form-control" ng-model="password" type="password" name="password" placeholder="password" />');
		
			$scope.loginButtonElement = angular.element('<input type="submit" class="btn btn-login" value="Log In" ng-class="{loading: busy}" />');
			$scope.createAccountElement = angular.element('<button class="btn btn-success" ng-submit="createUser">Create Account</button>');
			$scope.clearElement = angular.element('<div style="clear: both"></div>');
		
			$scope.logoutRoot = angular.element('<div class="logout"></div>');
			$scope.logoutUserInfoElement = angular.element('<div class="user-info"><p class="user-info-username">{{username}}</p></div>')
			$scope.logoutButtonElement = angular.element('<input type="button" ng-click="logout()" class="col-xs-6 btn btn-logout" value="Log Out" />')
			$scope.logoutClearElement = angular.element('<div style=\'clear:both;\'></div>');
			
            this.test = function() {
                console.log('test');
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

			// Login elements
			scope.loginFormElement.append(scope.loginHeaderElement);

			scope.loginFormElement.append(scope.alertElement);

			scope.loginFormElement.append(scope.usernameElement);
			scope.loginFormElement.append(scope.passwordElement);
			scope.loginFormElement.append(scope.loginButtonElement);

			scope.loginFormElement.append(scope.clearElement);
			
			scope.loginRoot.append(scope.loginFormElement);
			
			// Logout element
			scope.logoutRoot.append(scope.logoutUserInfoElement);
			scope.logoutRoot.append(scope.logoutButtonElement);
			scope.logoutRoot.append(scope.logoutClearElement);

			// Visual feedback that a login prompt was broadcasted
			scope.flash = function() {
				element.addClass("flash");
				scope.usernameElement.focus();

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
					inclusionRoot.append($compile(scope.logoutRoot)(scope));
					//element.empty(); 
					//element.append($compile(logoutRoot)(scope));
				}
				else {
					inclusionRoot.empty();
					inclusionRoot.append($compile(scope.loginRoot)(scope));
					//element.empty();
					//element.append($compile(loginRoot)(scope));
				}
			});

			scope.$watch(function() {
				return scope.loading;
			}, function(val) {
				if (val == true) {
					scope.loginButtonElement.val("Loading");
				}
				else {
					scope.loginButtonElement.val("Log In");	
				}
			});
		}
	};
});