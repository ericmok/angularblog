angular.module('main')

.controller('EditBlogCtrl', function($scope, $state, $stateParams, BlogsEndpoint) {
	$scope.blog = {
		title: '',
		description: ''
	};

	$scope.reloadBlog = function() {
		BlogsEndpoint.fetch($stateParams.blogId).then(function(data) {
				$scope.blog = data;
			});
	};

	$scope.reloadBlog();

	$scope.editPost = function() {
		BlogsEndpoint.update($scope.blog.id, {
								'description': $scope.blog.description
							});
		$scope.reloadBlog();
	};
});