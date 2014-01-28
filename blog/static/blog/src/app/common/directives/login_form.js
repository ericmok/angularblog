angular.module('LoginForm', ['Security'])


.directive('loginForm', function($compile, $timeout, auth) {

	var root = angular.element("<div></div>");

	var loginFormElement = angular.element('<form class="login-form" ng-submit="login()"></form>');
	var loginHeaderElement = angular.element('');

	var alertElement = angular.element('<div class="alert alert-danger" ng-show="failure" ng-bind="status"></div>');

	var usernameElement = angular.element('<input class="form-control" type="text" ng-model="username" name="username" placeholder="username" />');

	var passwordElement = angular.element('<input class="form-control" ng-model="password" type="password" name="password" placeholder="password" />');
	var loginButtonElement = angular.element('<input type="submit" class="btn btn-login" value="Log In" />');
	var createAccountElement = angular.element('<button class="btn btn-success" ng-submit="createUser">Create Account</button>');

	var logoutRoot = angular.element('<div></div>');
	var logoutUserInfoElement = angular.element('<div class="user-info"><p>Username: <b>{{username}}</b></p></div>')
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
			
			root.append(loginFormElement);
			
			// Logout element
			logoutRoot.append(logoutUserInfoElement);
			logoutRoot.append(logoutButtonElement);
			logoutRoot.append(logoutClearElement);

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
					element.append($compile(root)(scope));
				}
			});

			scope.$watch(function() {
				return scope.loading;
			}, function(val) {
				if (val == true) {
					loginButtonElement.val("Loading..");
				}
				else {
					loginButtonElement.val("Log In");	
				}
			});
		}
	};
});