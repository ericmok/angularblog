angular.module('Security', [])

.constant('urls', {
	token: "http://localhost:8000/blog/api-tokens"
})

.factory('auth', function($window, $http, urls) {
	var loginToken = null;

	return {
		login: function(username, password) {
			console.log("login");
			return $http.post(urls.token, {
				username: username, 
				password: password
			}).then(function(data, status, headers, config) {
				$window.sessionStorage.setItem("token", data.data.token);
				loginToken = data.data.token;
			}, function() {
				$window.sessionStorage.setItem("token", null);
				loginToken = null;
			});
		},
		isLoggedIn: function() {
			return loginToken == null;
		}
	};
})

.run(function(auth) {
	auth.loginToken = sessionStorage.getItem("token");
});