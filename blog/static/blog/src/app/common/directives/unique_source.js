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
