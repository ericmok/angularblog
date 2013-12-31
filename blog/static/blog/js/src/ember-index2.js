App = Ember.Application.create({
    LOG_TRANSITIONS: true
});

App.Memory = {
    POSTS_URL: "/blog/api/posts",
    models: {
        posts: []
    },
    history: [],
    currentWindowStack: []
}

App.Router.reopen({
    rootURL: "/blog/"
});


Ember.$.ajaxSetup({
    beforeSend: function(xhr) {
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.setRequestHeader("Accept", "application/json, text/javascript");
    }
});

App.Router.map(function() {
    this.resource("index", {path: "/"}, function() {
        this.resource("posts", {path: "/posts"});
        this.resource("posts", {path: "/posts/:postId"});
    });
});

App.IndexRoute = Ember.Route.extend({
    model: function(params) {
        return {
            server: window.server,
            memory: App.Memory
        }
    },
    renderTemplate: function() {
        this.render();
    }
});

App.PostsRoute = Ember.Route.extend({
    model: function(params) {
        return Ember.$.ajax(App.Memory.POSTS_URL + "/" + params.postId);
    },
    afterModel: function(model, transition) {
        App.Memory.models.posts.push( model );
    }
});




App.PostD3Component = Ember.Component.extend({
    tagName: "div",
    classNames: ["post-d3"],
    uuid: ["postd3", Math.random().toString(36).substring(4)].join(""),
    debug: "Pre-defined",
    didInsertElement: function() {
        Ember.run.scheduleOnce("afterRender", this, this.onCreate);
    },
    onCreate: function() {
        // if (!Ember.isArray(this.get("model"))) {
        //     this.set("model", [this.get("model")]);
        // }

        var selection = d3.select( "#" + this.get("elementId") )
                            .selectAll(".myd3")
                            .data([this.get("model")], function(d){ return d.id; });
        
        var postSelection = selection.enter()
                                    .append("div").html(function(d) {
                                                return "<h3>" + d.title + "</h3>"; 
                                            });


        var sentenceSelection = selection.selectAll("span")
                                    .data(function(d) { return d.sentences; },
                                            function(d,i) { return d.id } );

        //sentenceSelection.filter( function(d) { return.paragraph; } );

        sentenceSelection.enter()
                            .append("span")
                            .text(function(d) {
                                return d.text;
                            });



        selection.exit()
            .remove();
    }
});