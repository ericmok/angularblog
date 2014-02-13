/**
src/app/post/controllers.js

Need to refactor this dearly...
*/

angular.module('main')

.controller('PostCtrl', function($scope, $state, $stateParams, $location, $rootScope, auth, RequestCache, SentencesEndpoint, urls, $timeout) {

    // Has the page been bootstrapped with data yet? If not show some feedback
    $scope.isBootstrapping = true;
    
    // TODO
    $scope.error404 = false;
    
	$scope.postId = $stateParams.postId;

	/* 
	 Stores all the posts to be displayed side-by-side / carousel-style
	 The first index is selected by default. 2 items are loaded on init.
	 */
	$scope.sidebars = [];

	// Points to the current sidebar that has main focus
	$scope.currentPointer = 0;

	// Delay timer to load sidebar after a user mouses over a sentence
	$scope.timer = null; 

	// Delay timer to update url after a sentence is selected
	$scope.urlChangeTimer = null; 

	// TODO: Use this instead of setting isSelected flags everywhere!
	$scope.currentlySelectedSentenceId = -1;

	$scope.currentlySelectedSentenceObj = null;

	/* Stores the comments for the post in slot 0. 
	 Different from comments for a sentence.
	 */
	$scope.mainComments = {};

	// Loading boolean for the right-side sidebar (currentPointer + 1)
	$scope.loading = false;

	// For template. TODO: Have a data store for this?
	$scope.getCurrentPost = function() {
		return $scope.sidebars[$scope.currentPointer].results[0];
	};

	$scope.canRevisePost = function() {
		return $scope.sidebars[$scope.currentPointer].results[0].author == auth.getUsername();
	};

	$scope.isLoggedIn = function() {
		return auth.isLoggedIn();
	};

	$scope.createComment = function() {
		$rootScope.$broadcast('LOGIN_PROMPT');
		$scope.isMakingComment = true;
		//$location.path()
	};
    
	$scope.forAllSentencesInASidebar = function(sidebarCounter, func) {
		/* 
		Previous behavior:
		Looped through all the sentences in the specified sidebar
		and deselect all sentences except for sentenceId param
		*/

		var numberArticles = $scope.sidebars[sidebarCounter].results.length;

		for (var a = 0; a < numberArticles; a++) {

			var content = $scope.sidebars[sidebarCounter].results[a].content;

			for (var para = 0, n = content.paragraphs.length; para < n; para++) {

				for (var sent = 0; sent < content.paragraphs[para].sentences.length; sent++) {
					
					var sentence = content.paragraphs[para].sentences[sent];
					func(sentence);

				}
			}
		}
	};

	// Note: sentenceId will be parsed into number
	$scope.selectSentence = function(sentenceId, sidebarCounter) {

		$scope.currentlySelectedSentenceId = parseInt(sentenceId);

		// Make sure sidebars are NOT undefined before calling this
		$scope.forAllSentencesInASidebar(sidebarCounter, function(sentence) {
			if (sentence.id === $scope.currentlySelectedSentenceId) {
				//console.log('for loop', sentence);
				$scope.currentlySelectedSentenceObj = sentence;
			}
		});
        
        /*
         When a sentence is selected, lazy load the previous version relationship into the selected sentence object
         If the previous_version has the same text as the current one, that means that the sentence was modified
         TODO: This could be determined from a possible ratio field in the object that the server may return
         */
        SentencesEndpoint.getPreviousVersion( $scope.currentlySelectedSentenceObj ).then(function(sentence) {
            $scope.currentlySelectedSentenceObj.previous_sentence = sentence;
            $scope.currentlySelectedSentenceObj.previous_sentence_was_modified = function() {
                return $scope.currentlySelectedSentenceObj.previous_sentence.text !== $scope.currentlySelectedSentenceObj.text;
            };
        });
	};

	// If a user mouseouts, cancel timers
	$scope.cancelTimers = function() {

		$timeout.cancel($scope.timer);
		// $timeout.cancel($scope.urlChangeTimer);
	};

	$scope.updateSidebar = function(sentenceId, sidebarCounter) {
		//console.log('sidebar', sidebarCounter);
		//console.log('Change sidebar to:', sentenceId);

		// When starting a new request, remove previous requests
		$scope.cancelTimers();

		$scope.timer = $timeout(function() {

			$scope.loading = true;

			/* 
			 After the user has indicated their intent to 
			 look at a sentence, go make AJAX request
			 */
			RequestCache.getURL(urls.sentences + '/' + sentenceId + '/comments').then(function(data) {

				// Update the sidebar
				$scope.sidebars[$scope.currentPointer + 1] = data;
		
				
				// Update the URL if the user has stayed very long on the sentence
				$scope.urlChangeTimer = $timeout(function() {
					$location.search({sentence: sentenceId});
					$location.replace();
				}, 2000);

				$scope.loading = false;

				/*
				 Loops through the model to get sentence obj of the id.
				 This is used to be fired asap to give illusion of something happening
				 */
				$scope.selectSentence(sentenceId, sidebarCounter);


                if ($scope.currentlySelectedSentenceObj && $scope.currentlySelectedSentenceObj.previous_version !== null) {
                    SentencesEndpoint.fetch($scope.currentlySelectedSentenceObj.previous_version).then(function(data) {
                        // Previous data loading...
                        $scope.sidebars[$scope.currentPointer + 1].results.concat(data.results);
                    });
                }				
				
			});
            
            /* 
             Duplicated action that selectSentence does. 
             Purpose of this is to give immediate feedback.
             */
            $scope.currentlySelectedSentenceId = parseInt(sentenceId);
            
		// 450 millisecond. Coordinate with CSS transition timings!
		}, 450);
	};

	$scope.reloadMainComments = function() {
		RequestCache.invalidateURL(urls.posts + '/' + $scope.postId + '/comments');
		RequestCache.getURL(urls.posts + '/' + $scope.postId + '/comments').then(function(data) {
				console.log('sidebar: ', data);
				//$scope.sidebars[$scope.currentPointer + 1] = data;
				$scope.mainComments = data;
			});
	};

	$scope.bootstrap = function() {
				
		// Initial Loading: Load left side, Then right side
		RequestCache.getURL(urls.posts + '/' + $scope.postId).then(function(data) {
            
            $scope.isBootstrapping = false;
            
			$scope.sidebars[$scope.currentPointer] = {
				results: [data]
			};
	
			/* 
			 Load sentence from sentence query parameter
			 Since $location.replace() is called everytime the search params change,
			 there is no need to $watch the params.
	
			 Default if there is no search param: Load post comments into sidebar
			 */
			if ( $location.search().sentence !== undefined ) {
				
				RequestCache.getURL(urls.sentences + '/' + $location.search().sentence + '/comments').then(function(data) {
                    
					// If the sentence has no comments, just go back to default behavior
					if (data.results.length == 0) {
						$location.search({});
						$location.replace();
					} else {
						$scope.sidebars[$scope.currentPointer + 1] = data;
						$scope.selectSentence($location.search().sentence, $scope.currentPointer);
					}
				});	
			} else {
				
				// Load right sidebar default content
				// pass
			}
	
			// Load comments for the post
			RequestCache.getURL(urls.posts + '/' + $scope.postId + '/comments').then(function(data) {
				console.log('sidebar: ', data);
				//$scope.sidebars[$scope.currentPointer + 1] = data;
				$scope.mainComments = data;
			});
		
		}, function(data) {
            // The original post couldn't load!
            $scope.error404 = true;
            $state.go('error404');
        });			
	};

	// Bootstrap the controller with info as soon as page loads!
	$scope.bootstrap();
})

.controller('SentenceCommentCtrl', function($scope, $state, urls, RequestCache, PostsEndpoint, auth) {
    $scope.isMakingComment = false;
    $scope.commentWasMade = false;
    $scope.error = '';
	
    $scope.comment = {
        title: '',
        content: '',
        parent_content_type: '',
        parent_id: -1
    };
    
    $scope.makeComment = function(obj) {
        $scope.isMakingComment = true;	
        $scope.comment.parent_content_type = obj.content_type;
        $scope.comment.parent_id = obj.id;
    };
   
    $scope.submitComment = function() {
        console.log('Submit comment');
        console.log($scope.comment);
        PostsEndpoint.create($scope.comment.parent_content_type, 
                             $scope.comment.parent_id, 
                             $scope.comment.title,
                             $scope.comment.content).success(function(data) {
            
            // Success
            $scope.commentWasMade = true;
            $scope.error = '';
            $scope.isMakingComment = false;
            
			// reload doesn't work
			$state.reload();
			
			// Invalidate so we actually make bootstrap fetch new data
			RequestCache.invalidateURL(urls.sentences + '/' + $scope.comment.parent_id + '/comments');

			$scope.$parent.bootstrap();
        }).error(function(data) {
            $scope.commentWasMade = false;
            $scope.error = 'There was a problem. ' + data.error;
        });
    };
})

.controller('PostFormCtrl', function($scope, $state, $rootScope, PostsEndpoint, auth) {
	
	$scope.postCreated = false;
	$scope.errors = [];
	$scope.isLoading = false;

	$scope._isActive = false;

	$scope.model = {
		title: '',
		content: ''
	};

	$scope.isActive = function(val) {
		if (val) {
			$scope._isActive = val;
			return $scope._isActive;
		}
		return $scope._isActive;
	};

	$scope.makeActive = function() {
		$scope._isActive = true;
	};

	$scope.isLoggedIn = function() {
		return auth.isLoggedIn();
	};

	$scope.submitComment = function(content_type, id, callback) {

		if (!auth.isLoggedIn()) {
			$rootScope.$broadcast('LOGIN_PROMPT');
			return;
		}

        console.log('Submit comment');
        console.log($scope.model);

        $scope.isLoading = true;

        PostsEndpoint.create(content_type, 
                             id, 
                             $scope.model.title,
                             $scope.model.content).success(function(data) {
            
            // Success
            $scope.postCreated = true;
            $scope.errors = [];
            
            if (callback !== undefined) {
				callback();
            }

            $scope.isLoading = false;

        }).error(function(data) {

        	$scope.postCreated = false;

        	$scope.errors = [];

        	for (var key in data) {
        		if (data.hasOwnProperty(key)) {
        			$scope.errors.unshift({
        				name: key,
        				value: data[key]
        			});
        		}
        	}

        	$scope.isLoading = false;
        });
	};
});