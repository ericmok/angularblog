angular.module('Urls', [])

.constant('urls', {
	tokens: "http://localhost:8000/blog/api-tokens",
	users: "http://localhost:8000/blog/api/users",
	posts: "/blog/api/posts",
	blogs: "/blog/api/blogs"
});
