angular.module('main')

.controller('BlogCtrl', function($scope, $stateParams, $http, urls, auth, $rootScope, $state, $location, BlogsEndpoint) {
	
	// Warning:	latest.js contains BlogsCtrl
	
	console.log($stateParams.blogId);
	$scope.blogId = $stateParams.blogId;
	$scope.blog = null;
	$scope.posts = [];

	BlogsEndpoint.fetch($scope.blogId).then(function(response) {
		$scope.blog = response;

		$scope.canEditBlog = function() {
			// overrides default function
			if (auth.getUsername() == $scope.blog.creator) {
				return true;
			}
			else {
				return false;
			}
		}

		$http({
			url: [urls.blogs, '/', $scope.blogId, '/comments'].join(''),
			method: 'GET'
		}).then(function(response) {
			$scope.posts = response.data;
		});
	}, function(response) {
		console.log("FAI");
	});

	// This will change after we load the blog and determine permissions
	$scope.canEditBlog = function() {
		return false;
	};

	$scope.editBlog = function() {
		$location.path('/blog/' + $scope.blog.title + '/edit');
	};

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