angular.module('ModelRepresentations', [])

.directive("testElement", function() {
	return {
		restrict: "EA",
		template: "<div>Test</div>",
		replace: true,
		scope: {
			parentid: "=",
			parentct: "="
		},
		link: function(scope, element, attrs) {
			
		}	
	};
});