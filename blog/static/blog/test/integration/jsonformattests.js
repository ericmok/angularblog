
describe("JSON Format", function() {

	function checkAjaxInterface(data, xhr, name) {
		expect(xhr.status).toEqual(200);
		expect(data.count).not.toBeNull();
		
		expect(data.href).not.toBeNull();

		expect(data.results).not.toBeNull();
		//expect(data[name]).not.toEqual(name);
		//expect(data.template).not.toBeNull();
		if (data.count > 16) {
			expect(data.next).not.toBeNull();	
		}
		//expect(data.prev).not.toBeNull();
	}

	describe("Blog Interface", function() {
		it("has fields", function() {
			testAjax(function(callback) {
				Helpers.jsonRequest(Helpers.BLOGS_URL, "GET", null, callback);
			}, function(data, xhr) {
				checkAjaxInterface(data, xhr, "blogs");
			});
		});
	});
	describe("Post Interface", function() {
		it("has fields", function() {
			testAjax(function(callback) {
				Helpers.jsonRequest(Helpers.POSTS_URL, "GET", null, callback);
			}, function(data, xhr) {
				checkAjaxInterface(data, xhr, "posts");
			});
		});
	});
	describe("Sentence Interface", function() {
		it("has fields", function() {
			testAjax(function(callback) {
				Helpers.jsonRequest(Helpers.POSTS_URL, "GET", null, callback);
			}, function(data, xhr) {
				checkAjaxInterface(data, xhr, "sentences");
			});
		});
	});
});