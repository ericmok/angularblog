angular.module('main')

.controller('CreatePostCtrl', function($scope, $state, $stateParams, $location, auth, BlogsEndpoint, PostsEndpoint) {
	
	$scope.blogId = $stateParams.blogId;
	$scope.blog = null;

	$scope.title = '';
	$scope.content = '';

    $scope.isLoading = false; // For ajax feedback
    
	$scope.initPage = function() {
		BlogsEndpoint.fetch($scope.blogId).then(function(response) {
			$scope.blog = response;
		});
	};

	$scope.initPage();

	$scope.createPost = function() {	
        
        $scope.isLoading = true;
        
		return PostsEndpoint.create('blog', $scope.blog.id, $scope.title, $scope.content).success(function(data) {
			console.log('Created: ', data);
			//$location.path('/post/' + data.post.id);
			$state.go('post', {postId: data.post.id});
            
            $scope.isLoading = false;
		});
	};

	$scope.isLoggedIn = function() {
		return auth.isLoggedIn();
	};
});