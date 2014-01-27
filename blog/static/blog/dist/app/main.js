angular.module("main", ['ui.router'])

.config(function($stateProvider, $urlRouterProvider) {

	$urlRouterProvider.otherwise('/state1');

	$stateProvider
		.state('state1', {
			url: '/state1',
			templateUrl: '/static/blog/src/app/latest/latest.tpl.html'
		});
});