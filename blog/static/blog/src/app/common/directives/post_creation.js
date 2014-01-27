angular.module('PostCreation', ['Security'])

.directive("postInput", function(Security) {
	return {
		restrict: "EA",
		template: "<div><input type='text' /></div>",
		replace: true
	};
});