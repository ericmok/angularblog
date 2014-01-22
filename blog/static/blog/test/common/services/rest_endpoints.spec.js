describe("test", function() {
	it("works", function() {
		expect(true).toBe(true);
	})
});

describe("load modules", function() {
	var element, scope;

	beforeEach(module('ModelRepresentations'));

	beforeEach(inject(function ($compile, $rootScope) {
		var linkingFn = $compile('<test-element></test-element>');
		scope = $rootScope;
		element = linkingFn(scope);
	}));

	it("has test text in element", function() {	
		expect(element.html()).toBe("Test");
	});
});

describe("Generic Representation Directive", function() {
	var element, scope;
	beforeEach(module('ModelRepresentations'));

	beforeEach(inject(function($compile, $rootScope) {
		var linkingFn = $compile('<generic-representation type="blog" pk="1"></generic-representation>');
		scope = $rootScope;
		element = linkingFn(scope);
	}));

	it("has text", function() {
		
		expect(element.html()).toBe("genericRepresentation blog/1");
	});	
});