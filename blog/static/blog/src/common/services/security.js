angular.module('Security', [])

.constant('urls', {
	token: "http://localhost:8000/blog/api-tokens",
	user: "http://localhost:8000/blog/api/users"
})

.factory('auth', function($window, $http, urls) {
	var loginToken = null;
	var user = null;

	return {
		login: function(username, password) {
			console.log("login");
			return $http.post(urls.token, {
				username: username, 
				password: password
			}).then(function(data, status, headers, config) {
				$window.sessionStorage.setItem("token", data.data.token);
				loginToken = data.data.token;

				return $http.get(urls.user + "/" + username).then(function(response) {
					user = response.data;
					console.log("logged in");
				});
			}, function() {
				$window.sessionStorage.setItem("token", null);
				loginToken = null;
				user = null;
			});
		},
		isLoggedIn: function() {
			return loginToken != null;
		},
		user: function() {
			return user;
		}
	};
})

.run(function(auth) {
	auth.loginToken = sessionStorage.getItem("token");
});