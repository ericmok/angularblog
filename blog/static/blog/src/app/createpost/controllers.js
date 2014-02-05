angular.module('main')

.controller('CreatePostCtrl', function($scope, $stateParams) {
	$scope.blogId = $stateParams.blogId;
	$scope.blog = null;
	
	$scope.createPost = function() {
		
	};
});