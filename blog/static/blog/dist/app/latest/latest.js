angular.module('main')

.controller('LatestPostsCtrl', function($scope, ModelCacheAjax) {
	$scope.posts = ['a', 'b'];
});

