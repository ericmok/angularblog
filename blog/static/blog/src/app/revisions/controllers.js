angular.module('main').

controller('RevisionsCtrl', function($scope, $stateParams, PostsEndpoint) {
    $scope.post = null;
    
    PostsEndpoint.fetch($stateParams.postId).then(function(data) {
        $scope.post = data;
    });
});