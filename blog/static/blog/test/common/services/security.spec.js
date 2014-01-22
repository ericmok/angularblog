function testAjax(ajaxCallback, testCallback, delay) {
	var response = null;
	var responseXHR = null;
	var delay = delay || 1000;

	var testObj = {
		callback: function(data, textStatus, jqXHR) {
			response = data;
			responseXHR = jqXHR;
		}
	};
	spyOn(testObj, "callback").andCallThrough();

	runs(function() {
		ajaxCallback(testObj.callback);
	});
	waitsFor(function() {
		return (testObj.callback.callCount > 0);
	}, "ajax to finish", delay);
	runs(function() {
		console.log("FIN");
		testCallback(response, responseXHR);
	});
}

ddescribe("Security", function() {
	it("can log in", function() {
		module('Security');

		inject(function($window, $rootScope, $httpBackend, $http, auth, urls) {
			$httpBackend.whenPOST(/.*/).respond({token: "asdf"});

			testAjax(function(cb) {
				$http({
					url: urls.token,
					method: "POST"
				}).then(function() {
					cb();
				}, function() {
					cb();
				});
				$rootScope.$new().$apply();
			}, function() {
				expect(false).toBe(true);
			});
		});
	});
});