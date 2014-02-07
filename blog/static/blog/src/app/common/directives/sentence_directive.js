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