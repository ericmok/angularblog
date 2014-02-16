angular.module('main')

.controller('CreateBlogCtrl', function($scope, $http, urls, $state, $timeout, auth) {

	$scope.blog = {
		title: '',
		description: ''	
	};

	$scope.error = '';
	$scope.attemptedCreationRequest = false;

	$scope.createBlog = function() {
		console.log("create blog");
		console.log($scope.blog.title);
		console.log($scope.blog.description);

		return $http({
			method: 'POST',
			url: urls.blogs,
			data: {
				title: $scope.blog.title,
				description: $scope.blog.description
			},
			headers: {
				'X-Authorization': auth.loginToken,
				'X-CSRFToken': auth.getCSRFToken()
			}
		}).success(function(response) {
			console.log(response);
			$scope.attemptedCreationRequest = true;

			$state.go('blog', {blogId: $scope.blog.title});

		}).error(function(response) {
			console.log(response);
			// TODO: Make a proper error
			$scope.error = response.status;

			$scope.attemptedCreationRequest = true;
		});
	};
});