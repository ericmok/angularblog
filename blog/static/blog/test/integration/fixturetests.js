/**
This test should make AJAX calls to populate the database for further integration testing.
Creating fixtures by hand is difficult.
*/

describe("Fixture Test File", function() {
	it("loaded", function() {
		expect(true).toBe(true);
	});
});

describe("Fixture USERS", function() {
	it("can create user with post request", function() {
		var payload = {
			username: "alice",
			password: "testtest"
		};

		testAjax(function(callback) {
			Helpers.jsonRequest("/blog/api/users", "POST", payload, callback)
		}, function(data, xhr) {
			expect(xhr.status).toBe(201);
		});
	});
	it("cannot destroy user unless superuser", function() {
		testAjax(function(callback) {
			Helpers.jsonRequest("/blog/api/users/alice", "DELETE", null, callback)
		}, function(data, xhr) {
			expect(xhr.status).toBe(401);
		});
		testAjax(function(callback) {
			AuthModule.requestToken("eric", "wt25yq186vke1dcd", function(data) {
				Helpers.jsonRequest("/blog/api/users/alice", "DELETE", null, callback, {"X-Authorization": "Token " + data.token});
			});
		}, function(data, xhr) {
			expect(xhr.status).toBe(204);
		});
	});

	it("Populating with Alice", function() {
		var payload = {
			username: "alice",
			password: "testtest"
		};

		testAjax(function(callback) {
			Helpers.jsonRequest("/blog/api/users", "POST", payload, callback)
		}, function(data, xhr) {
			expect(xhr.status).toBe(201);
		});
	});

	it("Populating with Bobby", function() {
		var payload = {
			username: "bobby",
			password: "testtest"
		};

		testAjax(function(callback) {
			Helpers.jsonRequest("/blog/api/users", "POST", payload, callback)
		}, function(data, xhr) {
			expect(xhr.status).toBe(201);
		});
	});
});

var blogs = [
	{ author: "alice", title: "Science", description: "A blog about science.", is_restricted: false },
	{ author: "alice", title: "Math", description: "1 + 1 = 2", is_restricted: false },
	{ author: "bobby", title: "Physics", description: "F = MA", is_restricted: false },
	{ author: "bobby", title: "Papers", description: "Researchers.", is_restricted: false }
]

describe("Fixture BLOGS", function() {

	for (var i = 0; i < blogs.length; i++) {

		testAjax(function(callback) {
			
			AuthModule.requestToken(blogs[i].author, "testtest", function(data) {

				delete blogs[i].author;
				Helpers.jsonRequest(Helpers.BLOGS_URL, "POST", blogs[i], callback, {"X-Authorization": "Token " + data.token});
			});
		}, function(data, xhr) {
			expect(xhr.status).toBe(201);
		});
	}
});

var posts = [
	{}
]

describe("Fixture POSTS", function() {

});