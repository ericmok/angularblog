
angular.module("main", [
    'filters.moment',
	'ui.router', 
	'Security', 
    'RegisterForm',
	'LoginForm', 
	'Urls', 
	'AjaxCaching', 
	'Endpoints',
	'UniqueSource',
    'PostParentDirective',
    'Crypto'])

.config(function($stateProvider, $urlRouterProvider) {

	$urlRouterProvider.otherwise('/');

	$stateProvider
		.state('latest', {
			url: '/',
			templateUrl: '/static/blog/dist/app/latest/latest.tpl.html'
		})
        .state('error404', {
            url: '/error',
            templateUrl: '/static/blog/dist/app/error404/error404.tpl.html'
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
		.state('createpost', {
			url: '/blog/:blogId/createpost',
			templateUrl: '/static/blog/dist/app/createpost/createpost.tpl.html'
		})
		.state('post', {
			url: '/post/:postId',
			templateUrl: '/static/blog/dist/app/post/post.tpl.html'
		})
		.state('revisepost', {
			url: '/post/:postId/revise',
			templateUrl: '/static/blog/dist/app/revisepost/revisepost.tpl.html'
		})
        .state('revisions', {
            url: '/revisions/:postId',
            templateUrl: '/static/blog/dist/app/revisions/revisions.tpl.html'
        })
        .state('revisions.editions', { // TODO: Change to .editions
            url: '/:editionId',
            templateUrl: '/static/blog/dist/app/revisions/revisions.editions.tpl.html'
        });
})

.controller('NavCtrl', function($scope, BlogsEndpoint) {
    $scope.blogs = [];
    
    BlogsEndpoint.fetchAll().then(function (collection) {
        $scope.blogs = collection;
    });
});
