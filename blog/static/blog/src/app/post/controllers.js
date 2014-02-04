angular.module('main')

.controller('PostCtrl', function($scope, $stateParams, ModelCacheAjax, urls) {
	console.log($stateParams.postId);
	$scope.postId = $stateParams.postId;
	$scope.sidebars = [];

	ModelCacheAjax.getURL(urls.posts + '/' + $scope.postId).then(function(data) {
		$scope.sidebars[0] = data;
	});
});