describe("Tests involving sentences", function() {
	it("works", function() {
		expect(true).toBe(true);
	});

	describe("Fixture data with 1 user, 1 blog, 1 post, 1 sentence set, 2 sentences", function() {
		it("Make sure these pre-reqs are met before testing!", function() {
			expect(1).toBe(1);
		});
	});
});


describe("Posts Cont'd", function() {

	describe("Patch requests", function() {

		it("requires authorization", function() {
			testAjax(function(callback){ 
				AuthModule.requestToken(TestDB.user.username, TestDB.user.password, function(data) {
					Helpers.jsonRequest( Helpers.POSTS_URL + "/12345", "PATCH", null, callback, 
											{"X-HTTP-METHOD-OVERRIDE": "PATCH"});
				});
			}, function(data, xhr) {
				expect(xhr.status).toEqual(401);
			});
		});
		
		it("returns not found on bad pk", function() {
			testAjax(function(callback){ 
				AuthModule.requestToken(TestDB.user.username, TestDB.user.password, function(data) {
					Helpers.jsonRequest( Helpers.POSTS_URL + "/12345", "PATCH", null, callback, 
											{"X-HTTP-METHOD-OVERRIDE": "PATCH", "X-Authorization": "Token " + data.token});
				});
			}, function(data, xhr) {
				expect(xhr.status).toEqual(404);
			}, 1500);

			testAjax(function(callback){ 
				AuthModule.requestToken(TestDB.user.username, TestDB.user.password, function(data) {
					Helpers.jsonRequest( Helpers.POSTS_URL + "/a", "PATCH", null, callback, 
											{"X-HTTP-METHOD-OVERRIDE": "PATCH", "X-Authorization": "Token " + data.token});
				});
			}, function(data, xhr) {
				expect(xhr.status).toEqual(404);
			}, 1500);
		});

		it("can make update to existing post", function() {

			testAjax(function(callback) {

				AuthModule.requestToken(TestDB.alice.username, TestDB.alice.password, function(data) {
					Helpers.jsonRequest( Helpers.POSTS_URL + "/1", "PATCH", {
						content: "This is my sentence. This is my modified sentence"
					}, callback, {"X-HTTP-METHOD-OVERRIDE": "PATCH", "X-Authorization": "Token " + data.token});
				});				
			}, function(data, xhr) {
				expect(xhr.status).toEqual(201);
			}, 3000);
			
		});

		it("can merge with old sentences in post", function() {

			testAjax(function(callback) {
				AuthModule.requestToken(TestDB.alice.username, TestDB.alice.password, function(data) {
					Helpers.jsonRequest( Helpers.POSTS_URL + "/1", "PATCH", {
						content: "This is first sentence. This is my modified second sentence"
					}, callback, {"X-HTTP-METHOD-OVERRIDE": "PATCH", "X-Authorization": "Token " + data.token});
				});				
			}, function(data, xhr) {
				expect(xhr.status).toEqual(201);
				expect(data.number_merged).toBe(2);
			}, 3000);

		});

		it("can make revisions to post with no merging", function() {
			testAjax(function(callback) {
				AuthModule.requestToken(TestDB.alice.username, TestDB.alice.password, function(data) {
					Helpers.jsonRequest( Helpers.POSTS_URL + "/1", "PATCH", {
						content: "Equal protection law today is divided. When minorities challenge laws of general application and argue that government has segregated or profiled on the basis of race, plaintiffs must show that government acted for a discriminatory purpose, a standard that doctrine has made extraordinarily difficult to satisfy."
					}, callback, {"X-HTTP-METHOD-OVERRIDE": "PATCH", "X-Authorization": "Token " + data.token});
				});				
			}, function(data, xhr) {
				expect(xhr.status).toEqual(201);
				expect(data.number_merged).toBe(0);
			}, 3000);
		});

	});
});

describe("Sentence Endpoint", function() {
	it("can handle large numbers", function() {
		// This is for sentences of posts on a sentence
		testAjax(function(callback) {
			Helpers.jsonRequest( Helpers.SENTENCES_URL + "/160", "GET", null, callback);	
		}, function(data, xhr) {
			expect(xhr.status).toEqual(200);
			expect(data.results.length).toBeGreaterThan(1);
		});	
	});
	it("can receive GET request as array", function() {
		testAjax(function(callback) {
			Helpers.jsonRequest( Helpers.SENTENCES_URL, "GET", null, callback);	
		}, function(data, xhr) {
			expect(xhr.status).toEqual(200);
			expect(data.results.length).toBeGreaterThan(1);
		});	
	});
	it("can receive GET request for specific sentence", function() {
		testAjax(function(callback) {
			Helpers.jsonRequest( Helpers.SENTENCES_URL + "/1", "GET", null, callback);	
		}, function(data, xhr) {
			expect(xhr.status).toEqual(200);
			expect(data.id).not.toBeNull();
		});	
	});
	it("returns 404 on malformed pk involving non-digits", function() {
		testAjax(function(callback) {
			Helpers.jsonRequest( Helpers.SENTENCES_URL + "/1asdf", "GET", null, callback);	
		}, function(data, xhr) {
			expect(xhr.status).toEqual(404);
		});	
	})
});