App = Ember.Application.create({});



App.ApplicationAdapter = DS.FixtureAdapter.extend();

App.User = DS.Model.extend({
    username: DS.attr()
});

App.Blog = DS.Model.extend({
    created: DS.attr(),
    title: DS.attr("string"),
    creator: DS.attr("string")
});

App.Blog.FIXTURES = [
    {
        id: 1,
        created: (new Date()),
        title: "Science",
        creator: "eric"
    },
    {
        id: 2,
        created: (new Date()),
        title: "Philosophy",
        creator: "eric"
    }
];

App.Post = DS.Model.extend({
    title: DS.attr("string"),
    author: DS.attr("string"),
    
    created: DS.attr(),
    modified: DS.attr(),
    
    ordering: DS.attr(),

    parent_content_type: DS.attr(),
    parent_id: DS.attr()
});

App.Post.FIXTURES = [
    {
        id: 1,
        title: "Title here",
        author: "eric",
        created: (new Date()),
        modified: (new Date()),
        ordering: 0,
        parent_content_type: "blog",
        parent_id: 1
    }
];



App.Router.reopen({
    rootURL: "/blog/"
});

App.Router.map(function() {
    this.resource("blogs", {path: "/"});
    this.resource("blog", {path: "/:blog_id"});    
    this.resource("posts", { path: "/posts" });
});


App.BlogsRoute = Ember.Route.extend({
    model: function() {
        var store = this.get("store");
        return store.find("blog");
    },
    setupController: function(controller, model) {
        controller.set("blogs", model);
    }
});


App.BlogsController = Ember.ArrayController.extend({
    actions: {
        createBlog: function() {
            console.log("CREATE");
            var blogName = this.get("blogName");
            console.log(blogName);

            var rec = this.store.createRecord("blog", {
                created: (new Date()),
                title: blogName,
                creator: "No User"
            });

            this.set("blogName", "");
        }
    }
});


App.BlogRoute = Ember.Route.extend({
    model: function(param) {
        var ret = {title: "static title"};
        ret = this.get("store").find("blog", param.blog_id);
        return ret;
    },
    setupController: function(controller, model) {
        controller.set("model", model);
    }
})

App.BlogController = Ember.ObjectController.extend({
    actions: {
        test: function() {
            console.log(this.get("model"));            
        }
    }
});

