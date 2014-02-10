angular.module('Serializers', []).

factory('Blog', function() {
    return function(data) {
        this.id = data.id;
        this.title = data.title;
        this.description = data.description;
    };
});