angular.module('filters.moment', []).

filter('moment', function() {
    return function(date) {
        return moment(date).fromNow();
    };
}).

filter('momentdate', function() {
	return function(date) {
        return moment(date).format('LL');
    };
}).

filter('momentverbose', function() {
    return function(date) {
        return moment(date).format('LLLL');
    };
});