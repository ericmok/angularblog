function testAjax(ajaxCallback, testCallback, delay) {
	var response = null;
	var responseXHR = null;
	var delay = delay || 1000;

	var testObj = {
		callback: function(data, textStatus, jqXHR) {
			response = data;
			responseXHR = jqXHR;
		}
	};
	spyOn(testObj, "callback").andCallThrough();

	runs(function() {
		ajaxCallback(testObj.callback);
	});
	waitsFor(function() {
		return (testObj.callback.callCount > 0);
	}, "ajax to finish", delay);
	runs(function() {
		testCallback(response, responseXHR);
	});
}



var Helpers = {
	USERS_URL: "http://localhost:8000/blog/api/users", 
	BLOGS_URL: "http://localhost:8000/blog/api/blogs",
	POSTS_URL: "http://localhost:8000/blog/api/posts",
	SENTENCES_URL: "http://localhost:8000/blog/api/sentences",

	getCookie: function(key) {
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

	jsonRequest: function(url, method, params, callback, headers) {
				
		var _this = this;

		var requestId = Math.floor( Math.random() * 1000);

		console.log(["Sending", requestId, url].join(" ") + ":", JSON.stringify(params));
		
		var options = {

			url: url,
			method: method,
			beforeSend: function(xhr) {
				if (headers) {
					for (var prop in headers) {
						if ( headers.hasOwnProperty(prop) ) {
							xhr.setRequestHeader(prop, headers[prop]);
						}
					}	
				}
				xhr.setRequestHeader("Content-Type", "application/json");
				xhr.setRequestHeader("Accept", "application/json, text/javascript");
				xhr.setRequestHeader( "X-CSRFToken", _this.getCookie("csrftoken") );
			}
		};

		if (options.method.toLowerCase() != "get") {
			options.data = JSON.stringify(params);
		}

		return $.ajax( options 
				).done(function(data, textStatus, jqXHR) {

					console.log(["Receiving", requestId].join(" ") + ":");
					//console.log(JSON.stringify(data));
					console.log(data);
					callback(data, textStatus, jqXHR);

				}).fail(function(jqXHR, textStatus, errorThrown) {
								
					console.log(["Receiving", requestId].join(" ") + ":");
					//console.log(jqXHR.status);
					//var data = $.parseJSON( jqXHR.responseText );
					var data = JSON.parse( jqXHR.responseText );
					console.log(data);

					callback( data, textStatus, jqXHR );
				});		

	}
};

var AuthModule = {
	TOKENS_URL: "http://localhost:8000/blog/api-tokens",
	SIGNIN_URL: "http://localhost:8000/blog/sign-in",
	SIGNOUT_URL: "http://localhost:8000/blog/sign-out",
	requestToken: function(username, password, callback) {
		var payload = {
			username: username,
			password: password
		};
		return Helpers.jsonRequest(this.TOKENS_URL, "POST", payload, callback);
	}
};

var Blog = function() {
	this.id = null;
	this.title = null;
	this.creator = null;
	this.created = null;
}

Blog.prototype.objects = {
	serialize: function(ajax) {
		// Either ajax is a collection or a single object...
		var ret = [];

		_.each(ajax.results, function(item) {
			var b = new Blog();
			b.id = item.id;
			b.title = item.title;
			b.creator = item.creator;
			b.created = item.created;
			ret.push(b);
		});
		return ret;
	}
};



describe("Module Helpers", function() {
	
	it("can get csrftoken", function() {
		var test = Helpers.getCookie("csrftoken");
		console.log(test);
		expect( typeof test ).toBe("string");
		expect(test.length).toBe(32);
	});

	it("can make ajax call to users", function() {
		var cb = jasmine.createSpy();

		runs(function() {
		 Helpers.jsonRequest(Helpers.USERS_URL, "GET", null, cb);	
		});
		waitsFor(function() {
			return cb.callCount > 0;
		}, "ajax to finish", 1000);
		runs(function() {
			expect(1).toBe(1);
		});
		
	});

});
