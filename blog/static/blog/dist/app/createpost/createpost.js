angular.module('main')

.controller('CreatePostCtrl', function($scope, $state, $stateParams, urlConstructor, $location, auth, BlogsEndpoint, PostsEndpoint) {
	$scope.blogId = $stateParams.blogId;
	$scope.blog = null;

	$scope.title = '';
	$scope.content = '';

	$scope.initPage = function() {
		BlogsEndpoint.fetch($scope.blogId).then(function(response) {
			$scope.blog = response;
		});
	};

	$scope.initPage();

	$scope.createPost = function() {	
		return PostsEndpoint.create('blog', $scope.blog.id, $scope.title, $scope.content).success(function(data) {
			console.log('Created: ', data);
			//$location.path('/post/' + data.post.id);
			$location.path(urlConstructor.post(data.post.id));
		});
	};

	$scope.isLoggedIn = function() {
		return auth.isLoggedIn();
	};
});