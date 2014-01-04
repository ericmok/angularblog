App = Ember.Application.create({
    LOG_TRANSITIONS: true,
    LOG_TRANSITIONS_INTERNAL: true
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
    }
});

App.PostsRoute = Ember.Route.extend({
    model: function(params) {

        var _params = params;

        return Ember.$.ajax(App.Memory.POSTS_URL + "/" + params.postId).then(function(outerJson) {
            
            return Ember.$.ajax(App.Memory.POSTS_URL + "/" + _params.postId + "/comments").then(function(json) {

                outerJson.comments = json;

                console.log("MODEL");
                console.log(outerJson);
                return outerJson;
            });
        });
    },
    afterModel: function(model, transition) {
        App.Memory.models.posts.push( model );
    },
    setupController: function(controller, model) {
        controller.set("postListStack", []);
        controller.set("model", model);
    }
});


App.PostsController = Ember.Controller.extend(Ember.Evented, {
    numberLists: 0,
    postLists: [],
    postListStack: [],

    actions: {
        viewsentence: function(side, sentence) {
            // This triggers a post listing
            // However, do we create a new panel to display the listing
            // or do we reuse an existing listing?
            // Check this via the side argument
            console.log("viewsentence");
            console.log("side", side);
            console.log("sentence", sentence);


            
            this.trigger("viewSentence");
        },
        spawnList: function(side) {
            // Append to the postLists
            // For each postList, we render a /comments URL
            // For each list, the css left px value is scaled
            this.set("numberLists", this.get("numberLists") + 1);

            var postLists = this.get("postLists");
            var prevLength = postLists.length;

            
            postLists.arrayContentWillChange();
            postLists.push({counter: prevLength, left: prevLength*20, items: ['a','b']});
            postLists.arrayContentDidChange(prevLength, 0, 1);
        }
    }
});

App.PostsView = Ember.View.extend({
    templateName: "posts"
})

App.PostDetailView = Ember.View.extend({
    tagName: "div",
    side: "left",
    templateName: "post-detail-view",
    classNames: ["left-panel"],
    classNameBindings: ["left-panel-slide-left"],

    didInsertElement: function() {

    },
    click: function() {
        //this.toggleProperty("left-panel-slide-left");

    }
});

/**
List views will adjust its computedLeftStyle on instantiation to create
a sliding effect. 

*/
App.PostListView = Ember.View.extend({
    templateName: "post-list-view",
    childClassName: "post-list-view",
    computedLeftStyle: "0px",
    initialOffset: "70",
    width: "400",
    slideDelay: 50,
    didInsertElement: function() {
        console.log("DID INSERT ELEMENT");
        this.set("computedLeftStyle", this.computeLeftStyleUsingCounter() - this.get("initialOffset"));

        var _self = this;

        Ember.run.later(function() {
            console.log("RUN LATER");
            console.log(_self.get("counter"));
            _self.set("computedLeftStyle", _self.computeLeftStyleUsingCounter());
        }, this.get("slideDelay"));
    },
    computeLeftStyleUsingCounter: function() {
        return this.get("counter") * this.get("width");
    },
    leftStyle: function() {
        console.log("CHANGED LEFTSTYLE");
        var computedLeft = parseInt(this.get("computedLeftStyle"));
        computedLeft = "" + computedLeft + "px";
        return "left: " + computedLeft + "; position: absolute;";
    }.property("computedLeftStyle")
});

App.PostView = Ember.View.extend({
    templateName: "post-view",
    classNames: ["post", "left-panel"]
})

App.SentenceSegmentComponent = Ember.Component.extend({
    tagName: "span",
    classNameBindings: ['is-hovering'],
    click: function(ev) {
        console.log("CLICK", this.get("sentence").id);
        this.sendAction("viewsentence", this.get("side"), this.get("sentence").id);
    },
    mouseEnter: function(ev) {
        this.set("is-hovering", true);
    },
    mouseLeave: function(ev) {
        this.set("is-hovering", false);
    }
});


App.CommentView = Ember.View.extend({
    templateName: "comment-view",
    classNames: ["comment"]
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