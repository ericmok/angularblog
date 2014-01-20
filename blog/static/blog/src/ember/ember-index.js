App = Ember.Application.create({
    LOG_TRANSITIONS: true
});

var AppCache = {
    models: [],
    current: {}
};


Ember.$.ajaxSetup({
    beforeSend: function(xhr) {
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.setRequestHeader("Accept", "application/json, text/javascript");
    }
});


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
    this.resource("index", {path: "/"}, function() {
        this.resource("frontpage", {path: "/"});
        this.resource("blogs", {path: "/blogs"});
        this.resource("blog", {path: "/:blog_id"});
        this.resource("post", { path: "/post/:post_id" });
        this.resource("reply", { path: "/post/:post_id/:reply_id" });
    });
});


App.IndexRoute = Ember.Route.extend({
    model: function(param) {
        return {
            server: window.server
        }
    },
    setupController: function(controller, model) {
        console.log("IndexRoute > setupController");
        console.log(controller);
        controller.set("model", model);
        controller.set("server", model);
    }
});

App.IndexController = Ember.ObjectController.extend({
});


App.FrontpageRoute = Ember.Route.extend({
    model: function() {
        console.log("Index Route > model");
        return Ember.$.ajax("/blog/api/posts")
    }
});

App.BlogsRoute = Ember.Route.extend({
    model: function() {
        console.log("IndexRoute > Model");
        return Ember.$.ajax("/blog/api/blogs");
        //return this.store.find('blog');
    },
    setupController: function(controller, model) {
        console.log("BlogsRoute > setupController");

        AppCache.models.push(model);
        AppCache.current.blogs = model;
        controller.set("model", model.results);
        controller.set("blogs", model.results);
    }
});

App.BlogsController = Ember.ObjectController.extend({
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
})

App.BlogRoute = Ember.Route.extend({
    model: function(param) {
        //var ret = {title: "static title"};
        //ret = this.get("store").find("blog", param.blog_id);
        //return ret;
        console.log(param);

        var promise = Ember.$.ajax("/blog/api/blogs/" + param.blog_id + "/posts").then(function(json) {
            json.urlSegment = json.urlSegment || {};
            json.urlSegment.blog_id = param.blog_id;
            return json;
        }).then(function(json) {
            return json;
        });

        return promise;
    },
    setupController: function(controller, model) {
        AppCache.models.push(model);
        AppCache.current.blog = model;

        console.log("BlogRoute > setupController");
        controller.set("blog", this.modelFor('index'));
        
        console.log(this.modelFor('index'));
        controller.set("model", model.results);
        controller.set("urlSegment", model.urlSegment);

        console.log("urlSegment: ");
        console.log(model.urlSegment);

        controller.set("posts", model.results);
        controller.set("count", model.count);
        controller.set("next", (model.next!=null)?true:false);
        controller.set("prev", (model.prev!=null)?true:false);
        controller.set("currentPage", 1);
    }
})

App.BlogController = Ember.ArrayController.extend({

    actions: {
        next: function() {
            var _self = this;
            console.log("has next: " + this.get("next"));
            if (this.get("next") == true) {
                this.set("currentPage", this.get("currentPage") + 1);
                console.log(this.get("posts"));

                Ember.$.ajax("/blog/api/blogs/" + _self.get("urlSegment") + "/posts?page=" + _self.get("currentPage")).then(function(data, status, xhr) {
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

                Ember.$.ajax("/blog/api/blogs/" + _self.get("urlSegment") + "/posts?page=" + _self.get("currentPage")).then( function(json) {

                    console.log("Response " + json);
                    _self.set("posts", json.results);
                    _self.set("count", json.count);
                    _self.set("next", (json.next != null)?true:false);
                    _self.set("prev", (json.prev != null)?true:false);
                });
            }
        }
    }
});


//
// TODO: Convert all these components to views
// Views can handle 
App.PostSentenceComponent = Ember.Component.extend({
    tagName: "span",
    classNames: ["post-body sentence"],
    classNameBindings: ["isHovering"],
    isHovering: false,
    mouseEnter: function(ev) {
        console.log("MOUSE OVER");
        this.set("isHovering", true);
    },
    mouseLeave: function(ev) {
        this.set("isHovering", false);
    },
    click: function(ev) {
        this.sendAction("action", this.get("model"));
        this.sendAction("test");
    }
});

App.MyPostComponent = Ember.Component.extend({
    actions: {
        show: function(param) {
            console.log("SHOW");
            this.sendAction("action", param);
        },
        test: function(param) {
            console.log("TEST");
        }
    }
    
});



App.PostRoute = Ember.Route.extend({
    beforeModel: function(transition) {
        AppCache.current.asdf.push("test");
        console.log("APPCACHE");
        console.log(AppCache.current);
    },
    model: function(param) {
        console.log("PARAM");
        console.log(param);

        return Ember.$.ajax("/blog/api/posts/" + param.post_id);
    },
    afterModel: function(model) {

    },
    setupController: function(controller, model) {
        console.log("PostRoute > setupController");
        controller.set("model", model);
        controller.set("slave", []);
        controller.set("magic", false);
    },
    renderTemplate: function() {
        this.render("board");
    }
});



App.PostController = Ember.ObjectController.extend({
    bars: [],
    actions: {
        viewSentence: function(bar, sentenceId) {
            var _self = this;

            console.log("bars", _self.get("bars").length);
            console.log("bar", bar);
            console.log("sentenceId", sentenceId);
            
            Ember.$.ajax("/blog/api/sentences/" + sentenceId + "/comments").then(function(json) {
                console.log("viewSentence");

                var bars = _self.get("bars");
                bars[bar + 1] = { model: [] }

                bars.arrayContentWillChange();
                var last = bars.length;

                for (var i = 0; i < json.results.length; i++) {
                    bars[bar].model.push( json.results[i] );
                }

                bars.arrayContentDidChange(0, last, json.results.length);

                console.log("bars", _self.get("bars").length);
                console.log("bar", bar);
                console.log("sentenceId", sentenceId);
                //var slave = _self.get("slave");

                // slave.arrayContentWillChange();
                // var last = slave.length;

                // for (var i = 0; i < json.results.length; i++) {
                //     slave.push( json.results[i] );
                // }

                // slave.arrayContentDidChange(last, 0, json.results.length);
            });
        }
    }
});

App.postModel = Ember.View.extend({});


App.asdf = Ember.View.create({
    templateName: "asdf"
});



App.PostRepresentationComponent = Ember.Component.extend({
    bar: 1,
    actions: {
        viewSentence: function(param) {
            this.sendAction("viewSentence", parseInt( this.get("bar") ) + 1, param);
        }
    }
});

App.SentenceSegmentComponent = Ember.Component.extend({
    tagName: "span",
    classNames: ["post-body sentence"],
    classNameBindings: ["isHovering"],
    isHovering: false,
    mouseEnter: function(jqEv) {
        this.set("isHovering", true);
    },
    click: function(jqEv) {
        console.log("CLICKED");
        this.set("isHovering", true);
        this.sendAction("viewSentence", this.get("level"));
    },
    mouseLeave: function(jqEv) {
        this.set("isHovering", false);
    }
});

App.SlaveView = Ember.View.extend({
    templateName: "slave"
});

App.PostListView = Ember.View.extend({
    level: 0,
    templateName: 'PostListView'
});

