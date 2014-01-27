angular.module('ModelRepresentations', [])

.directive("testElement", function() {
	return {
		restrict: "EA",
		template: "<div>Test</div>",
		replace: true,
		scope: {
		},
		link: function(scope, element, attrs) {

		}	
	};
})

.directive("genericRepresentation", function($http, $compile, $interpolate) {
	var html = "<div>genericRepresentation {{type}}/{{pk}}</div>";

	return {
		restrict: "EA",
		template: "<div></div>",
		replace: true,
		scope: {
			pk: "=",
			type: "="
		},
		controller: function($scope) {
			$scope.model = {};

			$scope.fetchModel = function() {

			}
		},
		link: function(scope, element, attrs) {
			scope.$watch(function() {
				return scope.pk + "," + scope.type;
			}, function(newVal) {
				var compiled_html = $compile(html)(scope);
				element.append( angular.element(compiled_html) );
			});
		}
	};
});