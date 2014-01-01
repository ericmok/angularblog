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


App.PostsController = Ember.Controller.extend({
    actions: {
        viewsentence: function(side, sentence) {
            // This triggers a post listing
            // However, do we create a new panel to display the listing
            // or do we reuse an existing listing?
            // Check this via the side argument
            console.log("viewsentence");
            console.log("side", side);
            console.log("sentence", sentence);

            // If it is the left side, just change the right postlistview
        }
    }
});

App.LeftPostListController = Ember.Controller.extend({

});

App.RightPostListController = Ember.Controller.extend({
    
});

App.PostListView = Ember.View.extend({
    templateName: "post-list-view"
});

App.PostView = Ember.View.extend({
    templateName: "post-view"
})

App.SentenceSegmentComponent = Ember.Component.extend({
    click: function(ev) {
        console.log("CLICK", this.get("model").id);
        this.sendAction("viewsentence", this.get("side"), this.get("model").id);
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