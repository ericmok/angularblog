angular.module('main')

.controller('CreateBlogCtrl', function($scope, $http, urls, $state, $timeout, auth) {

	$scope.blog = {
		title: '',
		description: ''
	};

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

			$timeout(function() {

				// I know this is really messy, but give server delay...
				$state.go('blog', {blogId: response.id});
			}, 1000);

		}).error(function(response) {
			console.log(response);
		});
	};
});