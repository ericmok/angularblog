
angular.module("main", ['ui.router', 'Security', 'LoginForm', 'Urls', 'RestModule', 'UniqueInput'])

.config(function($stateProvider, $urlRouterProvider) {

	$urlRouterProvider.otherwise('/latest');

	$stateProvider
		.state('latest', {
			url: '/latest',
			templateUrl: '/static/blog/dist/app/latest/latest.tpl.html'
		})
		.state('createblog', {
			url: '/createblog',
			templateUrl: '/static/blog/dist/app/createblog/createblog.tpl.html'
		})
		.state('blog', {
			url: '/blog/:blogId',
			templateUrl: '/static/blog/dist/app/blog/blog.tpl.html'
		});
});
