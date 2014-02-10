angular.module('main').

controller('RevisionsCtrl', function($scope, $stateParams, PostsEndpoint) {
	$scope.isLoading = true;
	
    $scope.post = null;
    $scope.editions = [];
	$scope.selectedEdition = -1;
	
    PostsEndpoint.fetch($stateParams.postId).then(function(data) {
        $scope.post = data;
		
		$scope.post.editions.forEach(function(el) {
			$scope.editions.push(el);
		});
		
		$scope.isLoading = false;
    }, function(data) {
		$scope.isLoading = false;
	});
	
	$scope.selectEdition = function(id) {
		$scope.selectedEdition = id;
	};
}).

controller('RevisionsEditionsCtrl', function($scope, $state, $stateParams, PostsEndpoint, EditionsEndpoint) {
	$scope.post = null;
    $scope.edition = null;
	
	$scope.currentSentenceId = -1;
	
	$scope.isLoading = true;
	
	$scope.$watch(function() {
		return $scope.$parent.isLoading;
	}, function(val) {
		console.log('value:', val);
		if (val === false) {
			$scope.openRevision($stateParams.editionId);
		};
	});
	
	$scope.unhighlight = function() {
		$scope.currentSentenceId = -1;
	};
	
	$scope.highlightSentence = function(id) {
		if (id) {
			$scope.currentSentenceId = id;
		} else {
			return $scope.currentSentenceId;
		}
	};
	
	
	/*
	 Given 2 contents, generate color mapping for sentences
	 */
	$scope.colorMap = function(older, newer) {
		var colorStepSize = 360/70;
		var counter = 0;
		
		angular.forEach(newer.paragraphs, function(newParagraph) {
			angular.forEach(newParagraph.sentences, function(newSentence) {
				
				angular.forEach(older.paragraphs, function(oldParagraph) {
					angular.forEach(oldParagraph.sentences, function(oldSentence) {
						
						// console.log('sen:', oldSentence, newSentence);
						// color code old sentence with new sentence
						if (oldSentence.id === newSentence.previous_version) {
							
							// If color was already assigned (each sentence might have multiple decendents)
							if (oldSentence.color) {
								newSentence.color = oldSentence.color + Math.random() * 80;
							} else {
								
								if (oldSentence.text === newSentence.text) {
									
									// If sentence just stayed the same
									newSentence.color = 115;
									oldSentence.color = 115;
								} else {
									
									// If an actual modification was made
									newSentence.color = counter * colorStepSize + 214 + Math.random() * 270;
									oldSentence.color = newSentence.color;
								}	
							};							
						}
					});
				});
				
				counter++;
			});
		});
	};
	
	
	$scope.openRevision = function(id) {
		EditionsEndpoint.fetch($stateParams.editionId).then(function(data) {
			
			$scope.edition = data;
			
			$scope.$parent.selectEdition($scope.edition.id);

			/* 
			 Loop through editions array to find the previous version
			 Editions are sorted by most recent first
			 */
			if ($scope.$parent.post.editions.length > 1) {
				
				$scope.$parent.post.editions.forEach(function(el, index, array) {
					
					if (el.id == $scope.edition.id) {
						
						// Make sure we are not at the oldest revision
						if (index !== array.length - 1) {
							EditionsEndpoint.fetch(array[index + 1].id).then(function(data) {
								
								$scope.previousEdition = data;
								$scope.isLoading = false;
								
								$scope.colorMap($scope.previousEdition, $scope.edition);
							});
						}
					}
				});
			}
		});			
	};
});