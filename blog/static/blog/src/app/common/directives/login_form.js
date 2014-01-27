angular.module('LoginForm', ['Security'])

.directive('login-form', function($compile, auth) {
	return {
		restrict: 'EA', 
		template: '<div><input type="text" placeholder="username"/><input type="password" placeholder="password" /></div>',
		replace: true
	};
});