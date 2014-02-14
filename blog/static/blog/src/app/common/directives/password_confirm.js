angular.module('PasswordConfirm', [])

.directive('passwordConfirm', function() {
	return {
		require: 'ngModel',
		restrict: 'A',
		scope: {
			passwordConfirm: '@'
		}, 
		link: function(scope, element, attrs, ngModelCtrl) {
			attrs.$observe('passwordConfirm', function(val) {
				if (val === ngModelCtrl.$viewValue) {
					ngModelCtrl.$setValidity('confirmed', false);
				}
			});
		}
	};
});