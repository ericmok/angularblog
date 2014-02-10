angular.module('filters.moment', []).

filter('moment', function() {
    return function(date) {
        return moment(date).fromNow();
    };
}).

filter('momentverbose', function() {
    return function(date) {
        return moment(date).format('LLLL');
    };
});