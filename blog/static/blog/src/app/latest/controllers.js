angular.module('main')

.controller('LatestPostsCtrl', function($scope, urls, ModelCacheAjax) {
	console.log("controller");
	$scope.posts = {results: []};

	ModelCacheAjax.getURL(urls.posts).then(function(response) {
		$scope.posts = response;
	});
})

.controller('BlogsCtrl', function($scope, $rootScope, urls, ModelCacheAjax, $state, auth) {

	$scope.blogs = {};

	$scope.createBlog = function() {
		if (auth.isLoggedIn()) {
			$state.go("createblog");
		}
		else {
			$rootScope.$broadcast("LOGIN_PROMPT", {});
		}
	}

	ModelCacheAjax.getURL(urls.blogs).then(function(response) {
		$scope.blogs = response;
	}, function(response) {
		$scope.blogs = ['No blogs to display.'];
	});
});