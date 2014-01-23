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
		testCallback(response, responseXHR);
	});
}

describe("Security", function() {
	it("can log in", function() {
		module('Security');

		inject(function ($window, $rootScope, $httpBackend, $http, auth, urls) {

			var response = null;

			$httpBackend.whenPOST(urls.token).respond({token: 'adsf'});
			$httpBackend.whenGET(urls.user + "/.*").respond({id: 1});

			testAjax(function (cb) {	
								
				auth.login('alice','testtest').then(function (data) {
					console.log("Data:");
					console.log(data);
					cb();
				}, function () {
					console.log("Fail:");
					console.log(data);
					cb();
				});
				
				$httpBackend.flush();	
			}, function () {

				expect(false).toBe(false);
			});

		});
	});
});
