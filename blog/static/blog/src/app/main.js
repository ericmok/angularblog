
angular.module("main", [
	'ui.router', 
	'Security', 
	'LoginForm', 
	'Urls', 
	'AjaxCaching', 
	'Endpoints',
	'UniqueInput'])

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
		})
		.state('editblog', {
			url: '/blog/:blogId/edit',
			templateUrl: '/static/blog/dist/app/editblog/editblog.tpl.html'
		})
		.state('post', {
			url: '/post/:postId',
			templateUrl: '/static/blog/dist/app/post/post.tpl.html'
		})
		.state('createpost', {
			url: '/blog/:blogId/createpost', 
			templateUrl: '/static/blog/dist/app/createpost/createpost.tpl.html'
		});
});
