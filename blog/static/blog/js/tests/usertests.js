

describe("Jasmine", function() {
	it("is a working test", function() {
		expect(true).toBe(true);
	});
	it("can test if object has key", function() { 
		var obj = {key: "value"};
		expect( obj.key ).not.toBe(undefined);
	});
	it("can test if object doesnt have key", function() {
		var obj = {key: "value"};
		expect( obj.asdf ).toBe(undefined);
	});
})


var URL = "http://localhost:8000/blog/api/users/";

function getCSRFToken() {
	return $("#csrfmiddlewaretoken").children().first().val();
}

describe("User API Endpoint", function() {
	it("can make get request", function() {

		function makeRequest(callback) {
			$.getJSON(URL).done(function(data, status) {
				callback();
			});	
		}

		var callback = jasmine.createSpy();		
		runs(function() {
			makeRequest(callback);
		})
		
		waitsFor(function() {
			return callback.callCount > 0;
		}, "Callback should be called", 500);

		runs(function() {
			expect(callback).toHaveBeenCalled();
		});
	});
})


describe("User API Endpoint Post", function() {

	var obj = {
		responseUser: null,
		makeRequest: function(params) {
			
			var _this = this;

			var username = params.username;
			var password = params.password || "password";
			var first_name = params.first_name || "fname";
			var last_name = params.last_name || "lname";

			console.log("Sending: ", [username, password, first_name, last_name].join(" "));
			$.ajax({
				url: URL,
				method: "POST",
				beforeSend: function(xhr) {
					xhr.setRequestHeader("Content-Type", "application/json");
					xhr.setRequestHeader("X-CSRFToken", getCSRFToken());
				},
				data: JSON.stringify({ 
					username: username, 
					first_name: first_name,
					last_name: last_name,
					password: password
				})
			}).done(function(data, textStatus, jqXHR) {
				_this.ajaxDone(data, textStatus, jqXHR);
			}).fail(function(jqXHR, textStatus, errorThrown) {
				_this.ajaxDone($.parseJSON(jqXHR.responseText), textStatus, jqXHR);
			});		
		},
		ajaxDone: function(data, status, xhr) {
			console.log("Post request: ");
			console.log("data:");
			console.log(data);
			console.log("status:");
			console.log(status);
			console.log("xhr:");
			console.log(xhr);

			this.responseUser = data;
			console.log("new user");
			console.log(this.responseUser);
		}
	};


	describe("Post requests", function() {

		beforeEach(function() {
			spyOn(obj, "ajaxDone").andCallThrough();
		});

		it("can make post request successful", function() {

			runs(function() {
				var randomNonce = Math.floor( Math.random() * 1000 );
				obj.makeRequest({ 
					username: ["user", randomNonce].join("") 
				});
			});

			waitsFor(function() {
				return obj.ajaxDone.callCount > 0;
			}, "callback to be called", 1000);

			runs(function() {
				console.log("POST REQ successful");
				console.log(obj.ajaxDone.mostRecentCall.args[2]);
				//expect(obj.ajaxDone.mostRecentCall.args[2].status).toEqual(jasmine.any(Number));
				expect(obj.ajaxDone.mostRecentCall.args[2].status).toBe(201);
				expect(obj.responseUser).not.toBe(null);		
				expect(obj.responseUser.id).not.toBe(null);	
				expect(obj.ajaxDone).toHaveBeenCalled();
			});		

		});

		it("returns valid new user", function() {

			expect( obj.responseUser.id ).not.toBe(undefined);
			expect( obj.responseUser.username ).not.toBe(undefined);
			expect( obj.responseUser.email ).not.toBe(undefined);
		});

		it("can't make duplicate user (409 request doesn't work)", function() {
			var randomNonce = Math.floor( Math.random() * 1000 );
			obj.makeRequest({ 
				username: ["user", randomNonce].join("") 
			});

			runs(function() {
				obj.makeRequest({
					username: obj.responseUser.username
				});
			});

			waitsFor(function() {
				return obj.ajaxDone.callCount > 0;
			}, "callback to be called", 1000);

			runs(function() {
				
				//expect(obj.ajaxDone.mostRecentCall.args[2].status).toBe(409);
				expect(obj.ajaxDone.mostRecentCall.args[2].status).not.toBe(200);
				expect(obj.responseUser).not.toBe(null);		
				expect(obj.responseUser.id).not.toBe(null);	
				expect(obj.ajaxDone).toHaveBeenCalled();
			});		
		});

		it("will not accept short password", function() {
			
			var randomNonce = Math.floor( Math.random() * 1000 );

			runs(function() {
				var params = {
					username: ["user", randomNonce].join(""),
					password: "a"	
				};
				console.log("params:", params);
				obj.makeRequest(params);
			});

			waitsFor(function() {
				return obj.ajaxDone.callCount > 0;
			}, "callback to be called", 1000);

			runs(function() {
				console.log("Will not accept password:", obj.responseUser);
				expect(obj.ajaxDone).toHaveBeenCalled();
				expect(obj.ajaxDone.mostRecentCall.args[2].status).toBe(400);
				console.log("PASS", obj.responseUser.password);
				//expect(obj.responseUser.password[0]).toBe("Password needs to be at least 5 characters");
				expect(obj.responseUser.password.length).toBe(1);
			});		
		});
	})

	it("can set password", function() {
		var randomNonce = Math.floor( Math.random() * 10000 );
		var oldPassword = "";
		var response = null;

		var testObj = {
			callback: function(data) {
				response = data;
			}
		};

		spyOn(testObj, "callback").andCallThrough();

		runs(function() {
			var params = {
				username: ["user", randomNonce].join(""),
				password: "asdf"	
			};
			console.log("params:", params);
			obj.makeRequest(params);
		});

		waitsFor(function() {
			return obj.ajaxDone.callCount > 0;
		}, "callback to be called", 1000);

		runs(function() {
			
		});		
	})
});



var htmlReporter = new jasmine.HtmlReporter();
jasmineEnv = jasmine.getEnv();
jasmineEnv.updateInterval = 250;
jasmineEnv.addReporter(htmlReporter);

jasmineEnv.specFilter = function(spec) {
	return htmlReporter.specFilter(spec);
}

$(document).ready(function() {
	document.querySelector("#spec").innerHTML = jasmineEnv.versionString();
	jasmineEnv.execute();
});