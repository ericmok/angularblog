angular.module('main')

.controller('PostCtrl', function($scope, $stateParams, RequestCache, urls) {
	console.log($stateParams.postId);
	$scope.postId = $stateParams.postId;
	$scope.sidebars = [];

	RequestCache.getURL(urls.posts + '/' + $scope.postId).then(function(data) {
		$scope.sidebars[0] = data;
	});
});