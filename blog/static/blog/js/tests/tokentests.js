
describe("Token Tests", function() {
	it("works", function() {
		expect(true).toBe(true);
	});

	describe("Auth", function() {
		it("can obtain auth token", function() {

			var response = null;
			var responseXHR = null;

			var testObj = {
				callback: function(data, textStatus, jqXHR) {
					response = data;
					responseXHR = jqXHR;
				}
			};

			var payload = {
				username: "eric",
				password: "wt25yq186vke1dcd"
			};

			spyOn(testObj, "callback").andCallThrough();
			
			runs(function() {
				//Helpers.jsonRequest( AuthModule.TOKENS_URL, "POST", payload, testObj.callback);
				AuthModule.requestToken( "eric", "wt25yq186vke1dcd", testObj.callback);
			});
			waitsFor(function() {
				return testObj.callback.callCount > 0;
			}, "ajax to finish", 1000);
			runs(function() {
				expect( response ).not.toBeNull();
				expect( responseXHR.status ).toBe(200);
				expect( response.token ).not.toBeNull();
			});
		});

		it("can get number active sessions with bad token", function() {

			testAjax(function(callback) {
				Helpers.jsonRequest( AuthModule.TOKENS_URL, "GET", null, callback, { "X-Authorization": "asdf" });
				//AuthModule.requestToken( "eric", "wt25yq186vke1dcd", testObj.callback);
			}, function(response, responseXHR) {
				expect( response.active_token_sessions ).toEqual( jasmine.any(Number) );
			});
			
		});

		it("can receive different tokens with each token request", function() {
			var response = null;
			var responseXHR = null;
			var response2 = null;
			var responseXHR2 = null;

			var testObj = {
				callback: function(data, textStatus, jqXHR) {
					response = data;
					responseXHR = jqXHR;
				},
				callback2: function(data, textStatus, jqXHR) {
					response2 = data;
					responseXHR2 = jqXHR;
				}
			};

			var payload = {
				username: "eric",
				password: "wt25yq186vke1dcd"
			};

			spyOn(testObj, "callback").andCallThrough();
			spyOn(testObj, "callback2").andCallThrough();
			
			runs(function() {
				//Helpers.jsonRequest( AuthModule.TOKENS_URL, "POST", payload, testObj.callback);
				AuthModule.requestToken( "eric", "wt25yq186vke1dcd", testObj.callback);
				setTimeout( function() {
					AuthModule.requestToken( "eric", "wt25yq186vke1dcd", testObj.callback2)
				}, 100 );
			});
			waitsFor(function() {
				return (testObj.callback.callCount > 0) && (testObj.callback2.callCount > 0);
			}, "ajax to finish", 2400);
			runs(function() {
				expect( response && response2 ).toBeTruthy();
				expect( responseXHR.status ).toBe(200);
				expect( responseXHR2.status ).toBe(200);
				expect( response.token ).not.toBeNull();
				expect( response2.token ).not.toBeNull();
				expect( response.token ).not.toEqual( response2.token );
			});


			testAjax(function(callback) {
				Helpers.jsonRequest( AuthModule.TOKENS_URL, "GET", null, callback, { "X-Authorization": "asdf" });
				//AuthModule.requestToken( "eric", "wt25yq186vke1dcd", testObj.callback);
			}, function(response, responseXHR) {
				expect( response.active_token_sessions ).toEqual(1);
			});

		});


		it("can delete tokens", function() {
			
			testAjax(function(ev) {
				Helpers.jsonRequest( AuthModule.TOKENS_URL, "POST", {username: "eric", password: "wt25yq186vke1dcd"}, function(data) {
					Helpers.jsonRequest( AuthModule.TOKENS_URL, "DELETE", null, ev, { "X-Authorization": data.token});
				});
			}, function(response, responseXHR) {
				expect(response).not.toBeNull();
				expect(responseXHR.status).toBe(200);
			});

			testAjax(function(callback) {
				Helpers.jsonRequest( AuthModule.TOKENS_URL, "GET", null, callback, { "X-Authorization": "asdf" });
				//AuthModule.requestToken( "eric", "wt25yq186vke1dcd", testObj.callback);
			}, function(response, responseXHR) {
				expect( response.active_token_sessions ).toEqual(0);
			});

		});

		it("cannot delete non existent token", function() {
		
			testAjax(function(ev) {
				Helpers.jsonRequest( AuthModule.TOKENS_URL, "DELETE", null, ev, { "X-Authorization": "BLAH"});
			}, function(response, responseXHR) {
				expect(response).not.toBeNull();
				expect(responseXHR.status).toBe(404);
			});
		});

		it("denies token on invalid credentials", function() {

			var response = null;
			var responseXHR = null;

			var testObj = {
				callback: function(data, textStatus, jqXHR) {
					response = data;
					responseXHR = jqXHR;
				}
			};

			var payload = {
				username: "asdf",
				password: "1"
			};

			spyOn(testObj, "callback").andCallThrough();
			
			runs(function() {
				//Helpers.jsonRequest( AuthModule.TOKENS_URL, "POST", payload, testObj.callback);
				AuthModule.requestToken( "asdf", "1", testObj.callback);
			});
			waitsFor(function() {
				return testObj.callback.callCount > 0;
			}, "ajax to finish", 1000);
			runs(function() {
				expect( response ).not.toBeNull();
				expect( responseXHR.status ).not.toBe(200);
			});
		});


		it("denies access to creating blog (this test requires that Blog endpoint works)", function() {
			var response = null;
			var responseXHR = null;

			var testObj = {
				callback: function(data, textStatus, jqXHR) {
					response = data;
					responseXHR = jqXHR;
				}
			};

			var payload = {
				title: "My Blog",
				creator: 1
			};
			
			spyOn(testObj, "callback").andCallThrough();
			
			runs(function() {
				Helpers.jsonRequest( Helpers.BLOGS_URL, "POST", payload, testObj.callback);
			});
			waitsFor(function() {
				return testObj.callback.callCount > 0;
			}, "ajax to finish", 1000);
			runs(function() {
				expect( response ).not.toBeNull();
				expect( responseXHR.status ).not.toBe(201);
			});
		});
	});
});

describe("Log in page", function() {
		it("receive template on GET request to /login", function() {
			var response = null;
			var responseXHR = null;

			var testObj = {
				callback: function(data, status, jqXHR) {
					response = (data);
					responseXHR = jqXHR;
				}
			};
			
			spyOn(testObj, "callback").andCallThrough();


			runs(function() {
				Helpers.jsonRequest(AuthModule.SIGNIN_URL, "GET", null, testObj.callback);	
			});
			waitsFor(function() {
				return testObj.callback.callCount > 0;
			}, "ajax to finish", 1000);
			runs(function() {
				expect( response ).not.toBeNull();
				expect( responseXHR.status ).toBe(200);
				expect( response.template ).not.toBeNull();
				expect( response.template.data ).not.toBeNull();

				expect( response.template.data.username ).not.toBeNull();
				expect( response.template.data.password ).not.toBeNull();

			});
		});

		it("can log on with credentials", function() {
			var response = null;
			var responseXHR = null;

			var testObj = {
				callback: function(data, status, jqXHR) {
					response = (data);
					responseXHR = jqXHR;
				}
			};
			
			spyOn(testObj, "callback").andCallThrough();

			var credentials = {
				username: "eric",
				password: "wt25yq186vke1dcd"
			};

			runs(function() {
				Helpers.jsonRequest(AuthModule.SIGNIN_URL, "POST", 
									credentials, testObj.callback);	
			});
			waitsFor(function() {
				return testObj.callback.callCount > 0;
			}, "ajax to finish", 1000);
			runs(function() {
				expect( response ).not.toBeNull();
				expect( responseXHR.status ).toBe(200);
			});
		});



		it("can log out with credentials", function() {
			var response = null;
			var responseXHR = null;

			var testObj = {
				callback: function(data, status, jqXHR) {
					response = (data);
					responseXHR = jqXHR;
				}
			};
			
			spyOn(testObj, "callback").andCallThrough();


			runs(function() {
				Helpers.jsonRequest(AuthModule.SIGNOUT_URL, "POST", 
									null, testObj.callback);	
			});
			waitsFor(function() {
				return testObj.callback.callCount > 0;
			}, "ajax to finish", 1000);
			runs(function() {
				expect( response ).not.toBeNull();
				expect( responseXHR.status ).toBe(200);
			});
		});
	});