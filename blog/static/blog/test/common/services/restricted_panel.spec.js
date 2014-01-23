ddescribe("Restricted Panel", function() {

	beforeEach(function() {
		module("RestrictedPanel");
		module("Security");
	});

	it("doesn't display content if not logged in", function() {
		
		inject(function ($rootScope, $compile) {
			var scope = $rootScope.$new();
			var compiled = $compile( angular.element("<restricted-panel>Inner Content</restricted-panel>"))(scope);
			console.log(compiled);
			expect(compiled.text()).not.toMatch("Inner Content");
		});
	});	

	it("displays content if logged in", function() {

		inject(function ($rootScope, $compile, auth) {
			var scope = $rootScope.$new();
			var compiled = $compile( angular.element("<restricted-panel>Stuff</restricted-panel>") )(scope);
			
			auth.login('alice', 'testtest').then(function(response) {
				console.log("LOGIN");
			});

			console.log(compiled);
		});
	});
});