angular.module('main')

.controller('LatestPostsCtrl', function($scope, urls, PostsEndpoint) {
	console.log("controller");
	$scope.posts = {results: []};

//	RequestCache.getURL(urls.posts).then(function(response) {
//		$scope.posts = response;
//	});
	PostsEndpoint.fetchAll().then(function(data) {
		$scope.posts = data;
	});
})

.controller('BlogsCtrl', function($scope, $rootScope, $state, urls, RequestCache, auth) {

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