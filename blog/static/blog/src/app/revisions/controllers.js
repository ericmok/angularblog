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
	
	$scope.selectedSentence = null;
	
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
		$scope.selectedSentence = null;
	};
	
	$scope.highlightSentence = function(sentence) {
		$scope.selectedSentence = sentence;
	};
	
	
	/*
	 Given 2 contents, generate color mapping for sentences
	 */
	$scope.colorMap = function(older, newer) {
		var colorStepSize = 360/30;
		var counter = 0;
	   	var match = false;
        var tempOldSentence = null;
        var tempNewSentence = null;
        
        
        angular.forEach(older.paragraphs, function(oldParagraph) {
            angular.forEach(oldParagraph.sentences, function(oldSentence) {      
                 oldSentence.color = 0;
                oldSentence.saturation = '80%';
                oldSentence.lightness = '88%';   
            });
        });
        
        angular.forEach(newer.paragraphs, function(newParagraph) {
            angular.forEach(newParagraph.sentences, function(newSentence) {

                match = false;
                
                if (newSentence.previous_version !== null) {
                    
                    // Search for match
                    angular.forEach(older.paragraphs, function(oldParagraph) {
                        angular.forEach(oldParagraph.sentences, function(oldSentence) {      

                            //console.log('sen:', oldSentence, newSentence);
                            // color code old sentence with new sentence

                            if (oldSentence.id === newSentence.previous_version) {

                                match = true;

                                tempOldSentence = oldSentence;
                                tempNewSentence = newSentence;

                            } 

                        });
                    }); // end older loop 

                    if (match) {

                        // If color was already assigned (each sentence might have multiple decendents)
                        if (tempOldSentence.color !== 0) {

                            // Children sentences have similar colors if they have the same parent
                            tempNewSentence.color = tempOldSentence.color; // + Math.random() * 20;
                            tempNewSentence.saturation = tempOldSentence.saturation;
                            tempNewSentence.lightness = tempOldSentence.lightness;

                        } else {

                            if (tempOldSentence.text === tempNewSentence.text) {

                                // If sentence just stayed the same
                                var color = 223 + Math.random() * 270;
                                tempNewSentence.color = color;
                                tempNewSentence.saturation = '60%';
                                tempNewSentence.lightness = '95%';

                                tempOldSentence.color = color;
                                tempOldSentence.saturation = '60%';
                                tempOldSentence.lightness = '95%';

                            } else {

                                // If an actual modification was made
                                //tempNewSentence.color = 223;// + (214) + (Math.random() * 180);
                                //tempNewSentence.color = 223 + (counter * 60) + (Math.random() * 120);
                                tempNewSentence.color = 223 + Math.random() * 20;
                                counter++;

                                tempOldSentence.color = tempNewSentence.color;

                                tempNewSentence.saturation = '83%';
                                tempNewSentence.lightness = '88%';

                                tempOldSentence.saturation = '83%';
                                tempOldSentence.lightness = '88%';
                            }	
                        };							
                    } 
                } else { // previous_version is null
                    
                    newSentence.color = 134;
                    newSentence.saturation = '80%';
                    newSentence.lightness = '80%';
                }
                
			});
		}); // newer loop
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