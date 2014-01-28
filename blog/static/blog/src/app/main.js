angular.module("main", ['ui.router', 'RestModule', 'Security', 'LoginForm'])

.config(function($stateProvider, $urlRouterProvider) {

	$urlRouterProvider.otherwise('/latest');

	$stateProvider
		.state('latest', {
			url: '/latest',
			templateUrl: '/static/blog/dist/app/latest/latest.tpl.html'
		});
});