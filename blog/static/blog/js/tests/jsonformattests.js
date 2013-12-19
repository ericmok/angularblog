
describe("JSON Format", function() {
	describe("Blog Interface", function() {
		it("has fields", function() {
			testAjax(function(callback) {
				Helpers.jsonRequest(Helpers.BLOGS_URL, "GET", null, callback);
			}, function(data, xhr) {
				expect(xhr.status).toEqual(200);
				expect(data.count).not.toBeNull();
				expect(data.results).not.toBeNull();
				expect(data.href).not.toBeNull();
				expect(data.template).not.toBeNull();
				expect(data.next).not.toBeNull();
				expect(data.prev).not.toBeNull();
				
			});
		});
	});
});