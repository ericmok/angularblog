angular.module('main')

.controller('RevisePostCtrl', function($scope, $state, $stateParams, $rootScope, PostsEndpoint, auth) {
    $scope.edition = {id: -1, title: '', content: ''};
    
    // Are the state params valid so that the model loads?
    $scope.bootstrap = false;
    
    $scope.submitLoading = false;
    $scope.submitAttempted = false;
    $scope.submitSuccess = true;
    
    // Bootstrap the controller with data
    PostsEndpoint.fetch($stateParams.postId).then(function(data) {
           
        /* 
         This is a one-to-one mapping
         TODO: Make a post serializer...
         */
        $scope.edition.id = data.id,
        $scope.edition.title = data.title;
        $scope.edition.content = PostsEndpoint.flattenContent(data.content);
        $scope.oldContent = $scope.edition.content;

        $scope.attemptedRevisionRequest = false;
        $scope.error = '';
        
        $scope.revisionFormIsModified = function() {
            return $scope.oldContent !== $scope.edition.content;
        }

        // Allow function definition if the model exists
        $scope.submitRevision = function() {
            
			if (!auth.isLoggedIn()) { 
				$rootScope.$broadcast('LOGIN_PROMPT');
				return;
			}
			
            $scope.submitAttempted = true;
            $scope.submitLoading = true;
        
            PostsEndpoint.patch($scope.edition.id, $scope.edition.content).then(function(response) {
                
                $scope.submitLoading = false;
                $scope.submitSuccess = true;    
                $scope.attemptedRevisionRequest = true;
				
				PostsEndpoint.invalidateCache($stateParams.postId);
				
				$state.transitionTo('revisions', {postId: $stateParams.postId});
                
            }, function(response) {
                
                $scope.submitLoading = false;
                $scope.submitSuccess = false;
                $scope.attemptedRevisionRequest = true;    
            });
            
        };
                
        $scope.bootstrap = true;
    });
    
});