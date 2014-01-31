angular.module('Security', ['Urls'])

.factory('auth', function($window, $http, urls) {

	return {
		loginToken: null,
		username: null,
		tokenDate: 0,
		TOKEN_LIFE_TIME: (2 * 60 * 60 * 1000), // 2 hours
		
		login: function(username, password) {

			var self = this;

			console.log("auth.login");

			var promise = $http({
				method: "POST",
				url: urls.tokens,
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
				
				self.tokenDate = (new Date()).getTime();
				$window.sessionStorage.setItem("token_date", self.tokenDate);

				self.loginToken = data.token;
				self.username = username;
				// return $http.get(urls.users + "/" + username).then(fnugction(response) {
				// 	self.user = response.data;
				// 	console.log("logged in");
				// });
			});

			promise.error(function(data, status, headers, config) {

				$window.sessionStorage.removeItem("token");
				self.loginToken = null;
				self.username = null;
				self.tokenDate = 0;
			});

			return promise;
		},
		isLoggedIn: function() {
			// On login query, check if token still valid, if not, reset everything
			var lifeTime = this.TOKEN_LIFE_TIME;

			if ( (new Date()).getTime() > this.tokenDate + lifeTime ) {
				this.loginToken = null;
				this.username = null;
				this.tokenDate = 0;
				return false;
			}
			return this.loginToken !== null;
		},

		logout: function() {

			var self = this;

			$window.sessionStorage.removeItem("token");
			$window.sessionStorage.removeItem("token_date");
			$window.sessionStorage.removeItem("username");

			// Store the token in a private variable so it doesn't leak
			var tempLoginToken = self.loginToken;
			
			// Reset all the things
			self.loginToken = null;
			self.tokenDate = 0;
			self.username = null;

			return $http({
				url: urls.tokens,
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

			var promise = $http.post(urls.users, {username: username, password: password});

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
	auth.tokenDate = $window.sessionStorage.getItem("token_date");
	auth.username = $window.sessionStorage.getItem("username");
});

