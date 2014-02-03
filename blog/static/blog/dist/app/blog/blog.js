angular.module('main')

.controller('BlogCtrl', function($scope, $stateParams) {
	console.log($stateParams.blogId);
});