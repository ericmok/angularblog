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
