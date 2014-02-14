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