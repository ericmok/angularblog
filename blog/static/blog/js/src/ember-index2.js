
var Helpers = {
    USERS_URL: "/blog/api/users", 
    BLOGS_URL: "/blog/api/blogs",
    POSTS_URL: "/blog/api/posts",
    SENTENCES_URL: "/blog/api/sentences",

    getCookie: function(key) {
        var cookieValue = null;
        if (document.cookie && document.cookie != '') {
            var cookies = document.cookie.split(';');
            for (var i = 0; i < cookies.length; i++) {
                var cookie = jQuery.trim(cookies[i]);
                if (cookie.substring(0, key.length + 1) == (key + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(key.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    },

    jsonRequest: function(url, method, params, callback, headers) {
                
        var _this = this;

        var requestId = Math.floor( Math.random() * 1000);

        console.log(["Sending", requestId, url].join(" ") + ":", JSON.stringify(params));
        
        var options = {

            url: url,
            method: method,
            beforeSend: function(xhr) {
                if (headers) {
                    for (var prop in headers) {
                        if ( headers.hasOwnProperty(prop) ) {
                            xhr.setRequestHeader(prop, headers[prop]);
                        }
                    }   
                }
                xhr.setRequestHeader("Content-Type", "application/json");
                xhr.setRequestHeader("Accept", "application/json, text/javascript");
                xhr.setRequestHeader( "X-CSRFToken", _this.getCookie("csrftoken") );
            }
        };

        if (options.method.toLowerCase() != "get") {
            options.data = JSON.stringify(params);
        }

        return $.ajax( options 
                ).done(function(data, textStatus, jqXHR) {

                    console.log(["Receiving", requestId].join(" ") + ":");
                    //console.log(JSON.stringify(data));
                    console.log(data);
                    callback(data, textStatus, jqXHR);

                }).fail(function(jqXHR, textStatus, errorThrown) {
                                
                    console.log(["Receiving", requestId].join(" ") + ":");
                    //console.log(jqXHR.status);
                    //var data = $.parseJSON( jqXHR.responseText );
                    var data = JSON.parse( jqXHR.responseText );
                    console.log(data);

                    callback( data, textStatus, jqXHR );
                });     

    }
};

var AuthModule = {
    TOKENS_URL: "/blog/api-tokens",
    SIGNIN_URL: "/blog/sign-in",
    SIGNOUT_URL: "/blog/sign-out",
    requestToken: function(username, password, callback) {
        var payload = {
            username: username,
            password: password
        };
        return Helpers.jsonRequest(this.TOKENS_URL, "POST", payload, callback);
    }
};


App = Ember.Application.create({
    LOG_TRANSITIONS: true,
    LOG_TRANSITIONS_INTERNAL: true
});

App.Memory = {
    BLOGS_URL: "/blog/api/blogs",
    POSTS_URL: "/blog/api/posts",
    SENTENCES_URL: "/blog/api/sentences",
    models: {
        urls: [],
        blogs: [],
        posts: [],
        sentences: [],
        putURLInCache: function(url, model) {
            // Some URLs contain a collection...
            for (var i = 0; i < this.urls.length; i++) {
                if (this.urls[i].href == url) {
                    return false;
                }
            }
            urls.push({
                href: url,
                model: model
            });
            return true;
        }
    },
    getModelsOfURL: function(url) {
        for (var i = 0; i < this.urls.length; i++) {
            if (this.urls[i].href == url) {
                return this.urls[i].model;
            }
        }
        return null;
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

        return Ember.RSVP.all([

                // Main model -> Post
                Ember.$.ajax(App.Memory.POSTS_URL + "/" + _params.postId),

                // Comments model -> Collection
                Ember.$.ajax(App.Memory.POSTS_URL + "/" + _params.postId + "/comments"),

                // Sentence Comments -> Collection
                Ember.$.ajax(App.Memory.POSTS_URL + "/" + _params.postId + "/sentence_comments")

            ]).then(function(array) {
                var ret = {};

                ret.main = array[0];
                ret.comments = array[1];
                ret.sidebar = array[2];

                if (ret.main.parent_content_type == "blog") {
                    return Ember.$.ajax(App.Memory.BLOGS_URL + "/" + ret.main.parent_id).then(function(json) {
                        ret.parent = json;
                        return ret;
                    });
                }
                else if (ret.main.parent_content_type == "post") {
                    return Ember.$.ajax(App.Memory.POSTS_URL + "/" + ret.main.parent_id).then(function(json) {
                       ret.parent = json; 
                       return ret;
                    });
                }
                else if (ret.main.parent_content_type == "sentence") {
                    return Ember.$.ajax(App.Memory.SENTENCES_URL+ "/" + ret.main.parent_id).then(function(json) {
                        ret.parent = json;
                        return ret;
                    });
                }

                return ret;
            });

        // return Ember.$.ajax(App.Memory.POSTS_URL + "/" + params.postId).then(function(outerJson) {
            
        //     return Ember.$.ajax(App.Memory.POSTS_URL + "/" + _params.postId + "/comments").then(function(json) {

        //         outerJson.comments = json;

        //         console.log("MODEL");
        //         console.log(outerJson);


        //         console.log("Less than 16?" + outerJson.comments.results.length);

        //         if (outerJson.comments.results.length < 16) {
        //             return Ember.$.ajax(App.Memory.POSTS_URL + "/" + _params.postId + "/sentence_comments").then(function(json) {

        //                 outerJson.sidebar = [];

        //                 for (var i = 0; i < json.results.length; i++) {

        //                     outerJson.sidebar.push(json.results[i]);
        //                 }

        //                 return outerJson;
        //             });
        //         }
        //         else {
        //             return outerJson;
        //         }
        //     });
        // });
    },
    afterModel: function(model, transition) {
        App.Memory.models.posts.push( model );
    },
    setupController: function(controller, model) {
        //controller.set("postListStack", []);
        controller.set("model", model);
        controller.set("parent", model.parent);

        if (model.parent == 'blog')

        controller.set("main", model.main);
        controller.set("sidebar", model.sidebar);
        controller.set("comments", model.comments);

        if (model.main.next != null) {
            controller.set("mainHasNext", true);
        }
        // controller.set("comments", model.comments.results);
        // controller.set("sidebar", model.sidebar);
    }
});


App.PostsController = Ember.Controller.extend(Ember.Evented, {
    comments: [],
    sidebar: [],

    actions: {
        postIsInArray: function(array, pk) {

            for (var i = 0; i < array.length; i++) {
                if (array[i] == pk) {
                    return true;
                }
            }

            return false;
        },
        viewsentence: function(side, sentence) {
            // This triggers a post listing
            // However, do we create a new panel to display the listing
            // or do we reuse an existing listing?
            // Check this via the side argument
            console.log("viewsentence");
            console.log("side", side);
            console.log("sentence", sentence);

            (function(self) {
                Ember.$.ajax("/blog/api/sentences/" + sentence + "/comments")
                    
                    .then(function(json) {
                        // Gets called only if there are comments
                        console.log("THEN");
                        console.log(json);
                        var comments = self.get("comments");
                        var prevLength = comments.length;

                        
                        comments.arrayContentWillChange();

                        self.set("comments", []);

                        for (var i = 0; i < json.results.length; i++) {
                            comments.pushObject(json.results[i]);
                        }

                        console.log("COMMENTS");
                        console.log(comments);

                        comments.arrayContentDidChange(0, prevLength, json.results.length);

                        console.log("COMMENTS");
                        console.log(comments);
                    })
            })(this);
            
        }
    }
});

App.PostsView = Ember.View.extend({
    templateName: "posts"
})


App.ParentViewComponent = Ember.Component.extend({
    templateName: "parent-component",
    isBlog: function(model) {
        if (model.parent_content_type == 'blog') {
            return true;
        }
        return false;
    },
    isPost: function(model) {
        if (model.parent_content_type == 'post') {
            return true;
        }
        return false
    },
    isSentence: function(model) {
        if (model.parent_content_type == 'sentence') {
            return true;
        }
        return false;
    }
});

/**
List views will adjust its computedLeftStyle on instantiation to create
a sliding effect. 

*/
App.PostListView = Ember.View.extend({
    templateName: "post-list-view",
    childClassName: "post-list-view",
    computedLeftStyle: "0",
    initialOffset: "70",
    depth: 0,
    width: "400",
    slideDelay: 50,
    didInsertElement: function() {
        console.log("DID INSERT ELEMENT");
        this.set("computedLeftStyle", this.computeLeftStyleUsingCounter() - this.get("initialOffset"));

        var _self = this;

        Ember.run.later(function() {
            console.log("RUN LATER");
            console.log(_self.get("depth"));
            _self.set("computedLeftStyle", _self.computeLeftStyleUsingCounter());
        }, this.get("slideDelay"));
    },
    computeLeftStyleUsingCounter: function() {
        return this.get("depth") * this.get("width");
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
    classNames: ["sentence"],
    classNameBindings: ["is-hovering", "sentence-has-comments", "selected"],
    selected: false,

    didInsertElement: function() {
        if (this.get("sentence").number_replies > 0) {
            this.$().css({"font-weight": "bold"});
        }
    },
    click: function(ev) {
        console.log("CLICK", this.get("sentence").id);
        this.set("selected", true);
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