angular.module('main')

.controller('BlogCtrl', function($scope, $stateParams, $http, urls, auth, $rootScope, $state, $location) {
	
	console.log($stateParams.blogId);
	$scope.blogId = $stateParams.blogId;
	$scope.blog = null;
	$scope.posts = [];

	$http({
		url: [urls.blogs, '/', $scope.blogId].join(''),
		method: 'GET'
	}).then(function(response) {
		$scope.blog = response.data;

		$http({
			url: [urls.blogs, '/', $scope.blogId, '/comments'].join(''),
			method: 'GET'
		}).then(function(response) {
			$scope.posts = response.data;
		});
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