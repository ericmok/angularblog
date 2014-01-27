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