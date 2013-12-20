

describe("Jasmine", function() {
	it("works", function() {
		console.log("Jasmine Initial Test");
		expect(document).not.toBe(null);
		expect(true).toBeTruthy();
		expect($).not.toBe(null);
	});
});

describe("BLOG Ajax", function() {
	describe("GET", function() {

		it("can make ajax call to blogs", function() {
			
			testAjax(function(callback) {
 				Helpers.jsonRequest( Helpers.BLOGS_URL, "GET", null, callback);
			}, function(data, xhr) {
				expect(data).not.toBeNull();
			});
		});

		it("returns collection based response", function() {
			
			testAjax(function(callback) {
 				Helpers.jsonRequest( Helpers.BLOGS_URL, "GET", null, callback);
			}, function(data, xhr) {
				expect(data.count).not.toBeNull();
				expect(data.items).not.toBeNull();
				expect(data.href).not.toBeNull();
				expect(data.template).not.toBeNull();
				expect(data.links).not.toBeNull();
			});
		});

	});


	xdescribe("Serialization", function() {
		it("can serialize created blog", function() {

			var b = new Blog();
			var testData = null;
			
			var testObj = {
				callback: function(data) {
					testData = b.objects.serialize(data);
				}
			};
			
			spyOn(testObj, "callback").andCallThrough();

			runs(function() {
			 Helpers.jsonRequest( Helpers.BLOGS_URL, "GET", null, testObj.callback);	
			});
			waitsFor(function() {
				return testObj.callback.callCount > 0;
			}, "ajax to finish", 1000);
			runs(function() {
				expect( testData ).not.toBeNull();
				expect( testData.length ).not.toBeNull();
				expect( testData.items[0] instanceof Blog ).toBeTruthy();
			});
		});
	});



	describe("POST", function() {
		it("can recognize credentials in POST request", function() {
			var response = null;
			var responseXHR = null;

			var testObj = {
				callback: function(data, textStatus, jqXHR) {
					response = data;
					responseXHR = jqXHR;
				}
			};

			var payload = {
				title: "My Blog"
				//creator: 1
			};
			
			spyOn(testObj, "callback").andCallThrough();
			
			runs(function() {

				AuthModule.requestToken("eric", "wt25yq186vke1dcd", function(data, textStatus, jqXHR) {
					console.log("TOKEN: " + data.token);
					Helpers.jsonRequest( Helpers.BLOGS_URL, 
										 "POST", payload, 
										 testObj.callback, 
										 { 
										 	"X-Authorization": "Token " + data.token
										});
				});
			});
			waitsFor(function() {
				return testObj.callback.callCount > 0;
			}, "ajax to finish", 1000);
			runs(function() {
				expect( response ).not.toBeNull();
				expect( responseXHR.status ).not.toBe(403); // FORBIDDEN
			});
		});


		it("can create blog with (title, description)", function() {

			testAjax(function(callback) {
				var payload = {
					title: ["A super original blog!", Math.random()].join(" "),
					description: "Some description"
				};
				AuthModule.requestToken("eric", "wt25yq186vke1dcd", function(data, status, xhr) {
					Helpers.jsonRequest( Helpers.BLOGS_URL, "POST", payload, callback, {
						"X-Authorization": "Token " + data.token
					});
				});
			}, function(data, xhr) {
				expect(xhr.status).toEqual(201);
			});
		});

		it("can create blog with (title, description, is_restricted)", function() {

			testAjax(function(callback) {
				var payload = {
					title: ["A brand new blog!", Math.random()].join(" "),
					description: "Some description",
					is_restricted: true
				};
				AuthModule.requestToken("eric", "wt25yq186vke1dcd", function(data, status, xhr) {
					Helpers.jsonRequest( Helpers.BLOGS_URL, "POST", payload, callback, {
						"X-Authorization": "Token " + data.token
					});
				});
			}, function(data, xhr) {
				expect(xhr.status).toEqual(201);
			});
		});

		it("refuses to make duplicate Blog (title, creator) with POST request", function() {
			var response = null;
			var responseXHR = null;

			var testObj = {
				callback: function(data, textStatus, jqXHR) {
					response = data;
					responseXHR = jqXHR;
				}
			};

			var payload = {
				title: "My Blog"
				//creator: 1
			};
			
			spyOn(testObj, "callback").andCallThrough();
			
			runs(function() {

				AuthModule.requestToken("eric", "wt25yq186vke1dcd", function(data, textStatus, jqXHR) {
					console.log("TOKEN: " + data.token);
					Helpers.jsonRequest( Helpers.BLOGS_URL, 
										 "POST", payload, 
										 testObj.callback, 
										 { 
										 	"X-Authorization": "Token " + data.token
										});
				});
			});
			waitsFor(function() {
				return testObj.callback.callCount > 0;
			}, "ajax to finish", 1000);
			runs(function() {
				expect( response ).not.toBeNull();
				expect( responseXHR.status ).not.toBe(201); // FORBIDDEN
			});
		});

	});

	

	describe("PUT", function() {

	});

	describe("PATCH", function() {

	});

	describe("DELETE", function() {

	});

});

