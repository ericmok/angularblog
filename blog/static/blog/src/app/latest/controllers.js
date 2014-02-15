angular.module('main')

.controller('LatestPostsCtrl', function($scope, urls, $state, $location, PostsEndpoint, SentencesEndpoint) {
	
    // For posts data. Front page includes blogs loading but that is not so important since that's loaded on nav anyways...
    $scope.isBootstrapping = true;
    
	$scope.posts = {results: []};

	PostsEndpoint.fetchAll().then(function(data) {
		$scope.posts = data;
        $scope.isBootstrapping = false;
	});

    $scope.goToParent = function(post) {
        // TODO: add paragraph ability
        if (post.parent_content_type == 'blog') {
            $state.transitionTo('blog', {'blogId': post.parent_repr});
        } else if (post.parent_content_type == 'post') {
            $state.transitionTo('post', {'postId': post.parent_id});
        } else if (post.parent_content_type == 'sentence') {
            SentencesEndpoint.fetch(post.parent_id).then(function(data) {
                // Reload on search problem...
                //$state.transitionTo('post', {'postId': data.post, 'sentence': post.parent_id}); 
                //$state.transitionTo('post', {'postId': data.post});
                var loc = $state.href('post', { postId: data.post });
                
                // Remove hashtag #
                loc = loc.substring(1);
                
                $location.path(loc);
                
                // A '/comments' will be appended in the 'post' state
                $location.search({
                    'sentence':  + post.parent_id
                });
            });
        };
    };
})

.controller('BlogsCtrl', function($scope, $rootScope, $state, urls, BlogsEndpoint, RequestCache, auth) {

	$scope.blogs = {};

	$scope.createBlog = function() {
		if (auth.isLoggedIn()) {
			$state.go("createblog");
		}
		else {
			$rootScope.$broadcast("LOGIN_PROMPT", {});
		}
	}

    BlogsEndpoint.fetchAll().then(function(data) {
        $scope.blogs = data;
    }, function(data) {
        $scope.blogs = ['No blogs to display.'];
    });

});