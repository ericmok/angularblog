describe("Sentence Tests", function() {
	it("works", function() {
		expect(true).toBe(true);
	});

	describe("Fixture data with 1 user, 1 blog, 1 post, 1 sentence set, 2 sentences", function() {
		it("Make sure these pre-reqs are met before testing!", function() {
			expect(1).toBe(1);
		});
	});
});

describe("Patch requests", function() {
	
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

	it("can make update", function() {

		testAjax(function(callback) {
			AuthModule.requestToken(TestDB.user.username, TestDB.user.password, function(data) {
				Helpers.jsonRequest( Helpers.POSTS_URL + "/1", "PATCH", {
					content: "This is my sentence. This is my modified sentence"
				}, callback, {"X-HTTP-METHOD-OVERRIDE": "PATCH", "X-Authorization": "Token " + data.token});
			});				
		}, function(data, xhr) {
			expect(xhr.status).toEqual(201);
		}, 3000);
		
	});

	it("can merge sentences", function() {

		testAjax(function(callback) {
			AuthModule.requestToken(TestDB.user.username, TestDB.user.password, function(data) {
				Helpers.jsonRequest( Helpers.POSTS_URL + "/1", "PATCH", {
					content: "This is first sentence. This is my modified second sentence"
				}, callback, {"X-HTTP-METHOD-OVERRIDE": "PATCH", "X-Authorization": "Token " + data.token});
			});				
		}, function(data, xhr) {
			expect(xhr.status).toEqual(201);
			expect(data.number_merged).toBe(2);
		}, 3000);

		testAjax(function(callback) {
			AuthModule.requestToken(TestDB.user.username, TestDB.user.password, function(data) {
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