

describe("Post tests", function() {
	it("works", function() {
		expect(1).toEqual(jasmine.any(Number));
	});

	it("can make GET request", function() {
		testAjax(function(callback) {
			Helpers.jsonRequest( Helpers.POSTS_URL, "GET", null, callback);
		}, function(data, xhr) { 
			expect(data).not.toBeNull();
			expect(xhr.status).toEqual(200);
		});
	});
});

