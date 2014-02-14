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