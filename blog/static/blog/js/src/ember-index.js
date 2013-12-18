App = Ember.Application.create({});

App.ApplicationAdapter = DS.FixtureAdapter.extend();



App.Router.reopen({
    rootURL: "/blog/"
});

App.Router.map(function() {
    this.resource("blogs", {path: "/"});
    this.resource("posts", {path: "/:blog_id"});    
    //this.resource("posts", { path: "/posts" });
});


App.BlogsRoute = Ember.Route.extend({
    model: function() {
        return Ember.$.ajax("/blog/api/blogs");
    },
    setupController: function(controller, model) {
        controller.set("blogs", model.results);
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


App.PostsRoute = Ember.Route.extend({
    model: function(param) {
        //var ret = {title: "static title"};
        //ret = this.get("store").find("blog", param.blog_id);
        //return ret;
        return Ember.$.ajax("/blog/api/posts" + "?blog=" + 1);
    },
    setupController: function(controller, model) {
        controller.set("model", model);
    }
})

App.PostsController = Ember.ArrayController.extend({
    actions: {
        test: function() {
            console.log(this.get("model"));            
        }
    }
});

