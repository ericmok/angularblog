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