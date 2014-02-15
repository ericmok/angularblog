angular.module('main')

.controller('BlogCtrl', function($scope, $state, $stateParams, $http, urls, auth, $rootScope, $state, $location, BlogsEndpoint) {
	
	// Warning:	latest.js contains BlogsCtrl
	
	console.log($stateParams.blogId);
	$scope.blogId = $stateParams.blogId;
	$scope.blog = null;
	$scope.posts = [];
    
    // If loading content
    $scope.isBootstrapping = true;
    $scope.error404 = false;

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
            
            $scope.isBootstrapping = false;
		});
	}, function(response) {
		console.log("FAIL");
        $scope.error404 = true;
        $state.go('error404');
	});

	// This will change after we load the blog and determine permissions
	$scope.canEditBlog = function() {
		return false;
	};

	$scope.editBlog = function() {
		$location.path($state.go('editblog', {blogId: $scope.blog.title}) );
	};

	$scope.makePost = function() {
		if (!auth.isLoggedIn()) {
			$rootScope.$broadcast('LOGIN_PROMPT');
		}
		else {
			// Show a make post form or go to page
			//$location.path(urlConstructor.createpost($scope.blog.title));
			$state.transitionTo('createpost', {blogId: $scope.blog.title});
		}
	};
});