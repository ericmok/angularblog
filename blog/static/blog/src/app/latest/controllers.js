angular.module('main')

.controller('LatestPostsCtrl', function($scope, urls, RequestCache) {
	console.log("controller");
	$scope.posts = {results: []};

	RequestCache.getURL(urls.posts).then(function(response) {
		$scope.posts = response;
	});
})

.controller('BlogsCtrl', function($scope, $rootScope, urls, RequestCache, $state, auth) {

	$scope.blogs = {};

	$scope.createBlog = function() {
		if (auth.isLoggedIn()) {
			$state.go("createblog");
		}
		else {
			$rootScope.$broadcast("LOGIN_PROMPT", {});
		}
	}

	RequestCache.getURL(urls.blogs).then(function(response) {
		$scope.blogs = response;
	}, function(response) {
		$scope.blogs = ['No blogs to display.'];
	});
});