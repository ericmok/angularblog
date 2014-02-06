angular.module('ModelCache', ['AjaxCaching'])

.factory('ModelCache', function() {
	return {
		blogs: [],
		posts: [],
		sentences: []
	};
});