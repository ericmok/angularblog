angular.module('main')

.controller('PostCtrl', function($scope, $stateParams, $location, urlConstructor, RequestCache, urls, $timeout) {
	console.log($stateParams.postId);
	$scope.postId = $stateParams.postId;

	/* 
	 Stores all the posts to be displayed side-by-side
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


	$scope.createComment = function() {
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

		// This throws an error, sidebars are undefined for some reason
		$scope.forAllSentencesInASidebar(sidebarCounter, function(sentence) {
			if (sentence.id === $scope.currentlySelectedSentenceId) {
				//console.log('for loop', sentence);
				$scope.currentlySelectedSentenceObj = sentence;
			}
		});
	};

	// If a user mouseouts, cancel timers
	$scope.cancelTimers = function() {

		$timeout.cancel($scope.timer);
		// $timeout.cancel($scope.urlChangeTimer);
	};

	$scope.updateSidebar = function(sentenceId, sidebarCounter) {
		console.log('sidebar', sidebarCounter);
		console.log('Change sidebar to:', sentenceId);

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

			});

		// 400 millisecond. Coordinate with CSS transition timings!
		}, 400);
	};

	// Initial Loading: Load left side, Then right side
	RequestCache.getURL(urls.posts + '/' + $scope.postId).then(function(data) {
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
	
	});

});