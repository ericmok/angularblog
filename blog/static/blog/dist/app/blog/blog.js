angular.module('main')

.controller('BlogCtrl', function($scope, $stateParams, $http, urls, auth, $rootScope, $state, $location, BlogsEndpoint) {
	
	// Warning:	latest.js contains BlogsCtrl
	
	console.log($stateParams.blogId);
	$scope.blogId = $stateParams.blogId;
	$scope.blog = null;
	$scope.posts = [];

	BlogsEndpoint.fetch($scope.blogId).then(function(response) {
		$scope.blog = response;

		$http({
			url: [urls.blogs, '/', $scope.blogId, '/comments'].join(''),
			method: 'GET'
		}).then(function(response) {
			$scope.posts = response.data;
		});
	}, function(response) {
		console.log("FAI");
	});

	$scope.makePost = function() {
		if (!auth.isLoggedIn()) {
			$rootScope.$broadcast('LOGIN_PROMPT');
		}
		else {
			// Show a make post form or go to page
			$location.path('/blog/' + $scope.blog.title + '/createpost');
		}
	};
});