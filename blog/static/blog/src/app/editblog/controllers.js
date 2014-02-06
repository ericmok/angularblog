angular.module('main')

.controller('EditBlogCtrl', function($scope, $state, $stateParams, $location, urls, BlogsEndpoint) {
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

	$scope.editBlog = function() {
		BlogsEndpoint.update($scope.blog.id, {
								'description': $scope.blog.description
							});
		//$scope.reloadBlog();
		$location.path('blog' + '/' + $scope.blog.title);
	};
});