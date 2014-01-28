angular.module('Security', [])

.constant('urls', {
	token: "http://localhost:8000/blog/api-tokens",
	user: "http://localhost:8000/blog/api/users"
})

.factory('auth', function($window, $http, urls) {

	return {
		loginToken: null,
		username: null,

		login: function(username, password) {

			var self = this;

			console.log("login");
			var promise = $http({
				method: "POST",
				url: urls.token,
				data: {
					username: username, 
					password: password
				},
				headers: {
					"X-CSRFToken": self.getCSRFToken()
				}
			});

			promise.success(function (data, status, headers, config) {
				$window.sessionStorage.setItem("token", data.token);
				$window.sessionStorage.setItem("username", username);
				self.loginToken = data.token;

				// return $http.get(urls.user + "/" + username).then(fnugction(response) {
				// 	self.user = response.data;
				// 	console.log("logged in");
				// });
			});

			promise.error(function(data, status, headers, config) {
				$window.sessionStorage.setItem("token", null);
				self.loginToken = null;
				self.username = null;
			});

			return promise;
		},
		isLoggedIn: function() {
			return this.loginToken != null;
		},

		logout: function() {

			var self = this;

			$window.sessionStorage.removeItem("token");
			$window.sessionStorage.removeItem("username");

			var tempLoginToken = self.loginToken;
			
			self.loginToken = null;
			self.username = null;

			return $http({
				url: urls.token,
				method: "DELETE",
				headers: {
					"X-Authorization": tempLoginToken,
					"X-CSRFToken": self.getCSRFToken()
				}
			}).error(function () {
				console.log("Error");
			});
		},
		getCSRFToken: function() {
			var key = 'csrftoken';
			var cookieValue = null;
			if (document.cookie && document.cookie != '') {
				var cookies = document.cookie.split(';');
				for (var i = 0; i < cookies.length; i++) {
					var cookie = jQuery.trim(cookies[i]);
					if (cookie.substring(0, key.length + 1) == (key + '=')) {
						cookieValue = decodeURIComponent(cookie.substring(key.length + 1));
						break;
					}
				}
			}
			return cookieValue;
		},

		getUsername: function() {
			return this.username;
		},

		createUser: function(username, password) {

			var promise = $http.post(urls.user, {username: username, password: password});

			promise.success(function(response) {
				console.log(response.data);
			});

			promise.error(function (response) { 
				console.log(response.data);
			});

			return promise;
		}
	};
})

.run(function($window, auth) {
	auth.loginToken = $window.sessionStorage.getItem("token");
	auth.username = $window.sessionStorage.getItem("username");
});