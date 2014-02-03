angular.module('main')

.controller('BlogCtrl', function($scope, $stateParams, $http, urls) {
	
	console.log($stateParams.blogId);
	$scope.blogId = $stateParams.blogId;
	$scope.blog = null;

	$http({
		url: [urls.blogs, '/', $scope.blogId].join(''),
		method: 'GET'
	}).then(function(response) {
		$scope.blog = angular.toJson( response.data );
	});
});