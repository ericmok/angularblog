

describe("Post AJAX", function() {
	it("works", function() {
		expect(1).toEqual(jasmine.any(Number));
	});

	it("can make GET request", function() {
		testAjax(function(callback) {
			Helpers.jsonRequest( Helpers.POSTS_URL, "GET", null, callback);
		}, function(data, xhr) { 
			expect(data).not.toBeNull();
			expect(xhr.status).toEqual(200);
			expect(data.results).not.toBeNull();
		});
	});

	/**
	Preconditions: 
	Database must be with sparse post data!
	**/
	it("responds to bad pk's in URL", function() {
		testAjax(function(callback) {
			Helpers.jsonRequest( Helpers.POSTS_URL + "/1a", "GET", null, callback );
		}, function(data, xhr) { 
			expect(data).not.toBeNull();
			expect(xhr.status).toEqual(404);
			expect(data.detail).not.toBeNull();
		});

		testAjax(function(callback) {
			Helpers.jsonRequest( Helpers.POSTS_URL + "/1254635634", "GET", null, callback );
		}, function(data, xhr) { 
			expect(data).not.toBeNull();
			expect(xhr.status).toEqual(404);
			expect(data.detail).not.toBeNull();
		});
	});
	
	it("returns UnAuthorized 401 when POST with no credentials", function() {
		testAjax(function(callback) {
			Helpers.jsonRequest( Helpers.POSTS_URL, "POST", null, callback );
		}, function(data, xhr) { 
			expect(xhr.status).toEqual(401); // Unauthorized
		});
	});

	it("cannot create post with null payload", function() {
		
		testAjax(function(callback) {
			Helpers.jsonRequest( AuthModule.TOKENS_URL, "POST", {username: "eric", password: "wt25yq186vke1dcd"}, function(data, xhr) {
				Helpers.jsonRequest( Helpers.POSTS_URL, "POST", null, callback, {'X-Authorization': 'Token ' + data.token} );
			});			
		}, function(data, xhr) { 
			expect(xhr.status).toEqual(400);
		});
	});

	it("cannot create post with only (or no) title payload", function() {

		testAjax(function(callback) {
			Helpers.jsonRequest( AuthModule.TOKENS_URL, "POST", {username: "eric", password: "wt25yq186vke1dcd"}, function(data, xhr) {
				Helpers.jsonRequest( Helpers.POSTS_URL, "POST", {"title": ["AJAX Post", Math.random()].join(' ')}, callback, {'X-Authorization': 'Token ' + data.token} );
			});			
		}, function(data, xhr) { 
			expect(xhr.status).toEqual(400);
		});

		testAjax(function(callback) {
			Helpers.jsonRequest( AuthModule.TOKENS_URL, "POST", {username: "eric", password: "wt25yq186vke1dcd"}, function(data, xhr) {
				Helpers.jsonRequest( Helpers.POSTS_URL, "POST", {parent_content_type: "post", parent_id: 1}, callback, {'X-Authorization': 'Token ' + data.token} );
			});			
		}, function(data, xhr) { 
			expect(xhr.status).toEqual(400);
		});
	});

	it("cannot create post with bad content type payload", function() {

		testAjax(function(callback) {
			Helpers.jsonRequest( AuthModule.TOKENS_URL, "POST", {username: "eric", password: "wt25yq186vke1dcd"}, function(data, xhr) {
				Helpers.jsonRequest( Helpers.POSTS_URL, "POST", {"title": ["AJAX Post", Math.random()].join(' '), parent_content_type: "blah", parent_id: 1}, callback, {'X-Authorization': 'Token ' + data.token} );
			});			
		}, function(data, xhr) { 
			expect(xhr.status).toEqual(400);
			expect(data.parent_content_type).not.toBeNull();
			expect(data.parent_content_type).toMatch("not valid choice");
		});
	});

	it("cannot create post with bad parent id payload", function() {

		testAjax(function(callback) {
			Helpers.jsonRequest( AuthModule.TOKENS_URL, "POST", {username: "eric", password: "wt25yq186vke1dcd"}, function(data, xhr) {
				Helpers.jsonRequest( Helpers.POSTS_URL, "POST", {"title": ["AJAX Post", Math.random()].join(' '), parent_content_type: "post", parent_id: "a"}, callback, {'X-Authorization': 'Token ' + data.token} );
			});			
		}, function(data, xhr) { 
			expect(xhr.status).toEqual(400);
			expect(data.parent_id).not.toBeNull();
		});
	});

	/**
	Precondition: Should have at least 1 blog in test database!
	**/
	it("can create post with blog parent on good payload and credentials", function() {

		testAjax(function(callback) {
			Helpers.jsonRequest( AuthModule.TOKENS_URL, "POST", {username: "eric", password: "wt25yq186vke1dcd"}, function(data, xhr) {
				Helpers.jsonRequest( Helpers.POSTS_URL, "POST", {"title": ["AJAX Post", Math.random()].join(' '), parent_content_type: "blog", parent_id: 1}, callback, {'X-Authorization': 'Token ' + data.token} );
			});			
		}, function(data, xhr) { 
			expect(xhr.status).toEqual(201);
		});
	});

	it("can create post {title, parent_content_type, parent_id} with credentials", function() {

		testAjax(function(callback) {
			Helpers.jsonRequest( AuthModule.TOKENS_URL, "POST", {username: "eric", password: "wt25yq186vke1dcd"}, function(data, xhr) {
				Helpers.jsonRequest( Helpers.POSTS_URL, "POST", {"title": ["AJAX Post", Math.random()].join(' '), parent_content_type: "post", parent_id: 1}, callback, {'X-Authorization': 'Token ' + data.token} );
			});			
		}, function(data, xhr) { 
			expect(xhr.status).toEqual(201);
		});
	});

	it("can GET post and receive fields", function() {
		testAjax(function(callback) {
			Helpers.jsonRequest( Helpers.POSTS_URL + "/1", "GET", null, callback );
		}, function(data, xhr) { 
			expect(xhr.status).toEqual(200);
			expect( data.content_type ).not.toBeNull();
			expect( data.id ).not.toBeNull();
			expect( data.href ).not.toBeNull();
			expect( data.author ).not.toBeNull();
			expect( data.created ).not.toBeNull();
			expect( data.modified ).not.toBeNull();
			expect( data.parent_content_type ).not.toBeNull();
			expect( data.parent_id ).not.toBeNull();
			expect( data.sentences ).not.toBeNull();
		});
	});

	it("can create post with sentence payload", function() {

		testAjax(function(callback) {
			Helpers.jsonRequest( AuthModule.TOKENS_URL, "POST", {username: "eric", password: "wt25yq186vke1dcd"}, function(data, xhr) {
				var payload = {
					"title": ["AJAX Post", Math.random()].join(' '), 
					parent_content_type: "post", 
					parent_id: 1,
					content: "Hello Mr. Jason. I am Dr. Black. How is Mr. Snowden?"
				};
				setTimeout(function() {
					Helpers.jsonRequest( Helpers.POSTS_URL, "POST", payload, callback, {'X-Authorization': 'Token ' + data.token} );
				}, 300);
			});			
		}, function(data, xhr) { 
			expect(xhr.status).toEqual(201);
			expect(data.sentences).not.toBeNull();
			expect(data.sentences).toEqual( jasmine.any(Array) );
			expect(data.number_sentences).toEqual(3);
			expect(data.sentences[0].id).toEqual( jasmine.any(Number) );
		}, 2000);
	});


	xit("can handle creating post with malformed sentence payload", function() {

		testAjax(function(callback) {
			Helpers.jsonRequest( AuthModule.TOKENS_URL, "POST", {username: "eric", password: "wt25yq186vke1dcd"}, function(data, xhr) {
				var payload = {
					"title": ["AJAX Post", Math.random()].join(' '), 
					parent_content_type: "post", 
					parent_id: 1,
					content: "Phrase with no period"
				};
				setTimeout(function() {
					Helpers.jsonRequest( Helpers.POSTS_URL, "POST", payload, callback, {'X-Authorization': 'Token ' + data.token} );
				}, 300);
			});			
		}, function(data, xhr) { 
			expect(xhr.status).not.toEqual(201);
		}, 2000);
	});

	it("can make patch request to post", function() {

		testAjax(function(callback) {
			Helpers.jsonRequest( AuthModule.TOKENS_URL, "POST", {username: "eric", password: "wt25yq186vke1dcd"}, function(data, xhr) {
				var payload = {
					content: "Hello Mr. Jason. I am Dr. Black. How is Mr. Snowden?"
				};
				setTimeout(function() {
					Helpers.jsonRequest( Helpers.POSTS_URL + "/1", "PATCH", payload, callback, {'X-Authorization': 'Token ' + data.token} );
				}, 300);
			});			
		}, function(data, xhr) { 
			expect(xhr.status).not.toEqual(405);
		}, 2000);
	});

});

