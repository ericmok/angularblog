App = Ember.Application.create({});

App.ApplicationAdapter = DS.RESTAdapter.extend({
    namespace: 'blog/api',
    find: function(store, type, id) {
        console.log("FIND");
        console.log(store);
        console.log(type);
        console.log(id);
    }
});

App.Blog = DS.Model.extend({
    title: DS.attr()
});

App.Router.reopen({
    rootURL: "/blog/"
});

App.Router.map(function() {
    this.resource("blogs", {path: "/"});
    this.resource("posts", {path: "/:blog_id"});
    this.resource("post", { path: "/:post_id" });
});


App.BlogsRoute = Ember.Route.extend({
    model: function() {
        return Ember.$.ajax("/blog/api/blogs");
        //return this.store.find('blog');
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
        console.log(param);
        return Ember.$.ajax("/blog/api/blogs/" + param.blog_id + "/posts");
    },
    setupController: function(controller, model) {
        controller.set("posts", model.results);
        controller.set("count", model.count);
        controller.set("next", (model.next!=null)?true:false);
        controller.set("prev", (model.prev!=null)?true:false);
        controller.set("currentPage", 1);
    }
})

App.PostsController = Ember.ArrayController.extend({

    actions: {
        next: function() {
            var _self = this;
            console.log("has next: " + this.get("next"));
            if (this.get("next") == true) {
                this.set("currentPage", this.get("currentPage") + 1);
                console.log(this.get("posts"));

                Ember.$.ajax("/blog/api/blogs/" + "1" + "/posts?page=" + _self.get("currentPage")).success(function(data, status, xhr) {
                    console.log("Response " + data);
                    _self.set("posts", data.results);
                    _self.set("count", data.count);
                    _self.set("next", (data.next != null)?true:false);
                    _self.set("prev", (data.prev != null)?true:false);
                });
            }
        },
        prev: function() {
            var _self = this;
            console.log("has next: " + this.get("next"));
            if (this.get("prev") == true) {
                this.set("currentPage", this.get("currentPage") - 1);
                console.log(this.get("posts"));

                Ember.$.ajax("/blog/api/blogs/" + "1" + "/posts?page=" + _self.get("currentPage")).success(function(data, status, xhr) {
                    console.log("Response " + data);
                    _self.set("posts", data.results);
                    _self.set("count", data.count);
                    _self.set("next", (data.next != null)?true:false);
                    _self.set("prev", (data.prev != null)?true:false);
                });
            }
        }
    }
});

App.PostRoute = Ember.Route.extend({
    model: function(param) {
        console.log("PARAM");
        console.log(param);

        Ember.$.ajaxSetup({
            beforeSend: function(xhr) {
                xhr.setRequestHeader("Content-Type", "application/json");
                xhr.setRequestHeader("Accept", "application/json, text/javascript");
            }
        });
        return Ember.$.ajax("/blog/api/posts/" + param.post_id);
    },
    setupController: function(controller, model) {
        controller.set("model", model);
        controller.set("post", model);
    }
});

App.PostController = Ember.ObjectController.extend({

});