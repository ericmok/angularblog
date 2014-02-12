angular.module('PostParentDirective', ['ui.router', 'Endpoints'])

.directive('postParent', function($compile) {
    return {
        restrict: 'EA',
        template: '<div ng-transclude></div>',
        replace: true,
        transclude: true,
        scope: {
            parentContentType: '=',
            parentId: '=',
            parentRepr: '='
        },
        controller: function($scope, $state, SentencesEndpoint) {
            
            if ($scope.parentContentType === 'blog') {
                
                $scope.sref = $state.href('blog', {blogId: $scope.parentRepr});
                $scope.representation = $scope.parentRepr;   
                
            } else if ($scope.parentContentType === 'post') {
                
                $scope.sref = $state.href('post', {postId: $scope.parentId});
                $scope.representation = $scope.parentRepr;
                
            } else if ($scope.parentContentType === 'paragraph') {
                
                $scope.sref = 'latest';
                $scope.representation = $scope.parentRepr;
                
            } else if ($scope.parentContentType == 'sentence') {
                
                SentencesEndpoint.fetch($scope.parentId).then(function(data) {
                    var loc = $state.href('post', { postId: data.post }) + '?sentence=' + $scope.parentId;
                    $scope.sref = loc;
                });
                
                $scope.representation = $scope.parentRepr;
            }

            this.getParentContentType = function() {
                return $scope.parentContentType;
            };
            
            this.getLink = function() {
                return $scope.sref;
            };
        },
        link: function(scope, element, attrs) {

//            scope.$watch(function() {
//                return scope.sref;
//            }, function(val) {
//                 var el = $compile(scope.anchor)(scope);
//                el.attr('href', val);
//                el.empty();
//                el.append( $compile(angular.element('<p>{{scope.representation}}</p>'))(scope) );
//
//                console.log('el:', el);
//
//                element.append(el); 
//            });
        }
    };
    
}).

directive('blogTemplate', function() {
    return {
        restrict: 'EA',
        template: '<div ng-if="isActive"><div ng-transclude></div></div>',
        replace: true,
        transclude: true,
        require: '^postParent',
        controller: function($scope) {
        },
        link: function(scope, element, attrs, postParentCtrl) {
            scope.$watch(function() {
                return postParentCtrl.parentContentType;
            }, function(val) {
               if (postParentCtrl.parentContentType === 'blog') {
                   scope.isActive = true;
                } 
            });
        }
    };
}).

directive('postTemplate', function() {
    return {
        restrict: 'EA',
        template: '<div ng-if="isActive"><div ng-transclude></div></div>',
        replace: true,
        transclude: true,
        require: '^postParent',
        controller: function($scope) {
        },
        link: function(scope, element, attrs, postParentCtrl) {
            scope.$watch(function() {
                return postParentCtrl.parentContentType;
            }, function(val) {
               if (postParentCtrl.parentContentType === 'post') {
                   scope.isActive = true;
                } 
            });
        }
    };
}).

directive('paragraphTemplate', function() {
    return {
        restrict: 'EA',
        template: '<div ng-if="isActive"><div ng-transclude></div></div>',
        replace: true,
        transclude: true,
        require: '^postParent',
        controller: function($scope) {
        },
        link: function(scope, element, attrs, postParentCtrl) {
            scope.$watch(function() {
                return postParentCtrl.parentContentType;
            }, function(val) {
               if (postParentCtrl.parentContentType === 'paragraph') {
                   scope.isActive = true;
                } 
            });
        }
    };
}).

directive('sentenceTemplate', function($compile) {
    return {
        require: '^postParent',
        restrict: 'EA',
        template: '<div><div ng-if="isSentence == true"><div ng-transclude></div></div></div>',
        transclude: true,
        replace: true,
        controller: function($scope) {
            $scope.isSentence = false;
            $scope.sref = 'test';
            
            this.goToParent = function() {
                console.log('go to parent');
            };
        },
        link: function(scope, element, attrs, postParentCtrl) {
                
                if (postParentCtrl.getParentContentType() === 'sentence') {
                    scope.isSentence = true;
                    
                    scope.$watch(function() {
                        postParentCtrl.getLink();
                    }, function(val) {
                        scope.sref = val;
                    });
                } 

        }
    };
})

.directive('genericPointer', function() {
})

.directive('referenceModel', function($state, SentencesEndpoint) {
    
    /*
    Sets the href attribute to point to a page on the site that can display the model
    */
    return {
        scope: {
            parentContentType: '@',
            parentId: '@'
        },
        controller: function($scope) {
            $scope.link = '#';
            $scope.parentContentType = null;
            $scope.parentId = null;
            
            $scope.setParentContentType = function(val) {
                $scope.parentContentType = val;
                if ($scope.parentId !== null) {
                    $scope.doWork();
                }
            };
            
            $scope.setParentId = function(val) {
                $scope.parentId = val;
                if ($scope.parentContentType !== null) {
                    $scope.doWork();
                }
            };
            
            $scope.doWork = function() {
                switch ($scope.parentContentType) {
                    case 'blog':
                        $scope.link = $state.href('blog', {blogId: $scope.parentId});
                        $scope.render();
                        break;
                    case 'post':
                        $scope.link = $state.href('post', {postId: $scope.parentId});
                        $scope.render();
                        break;
                    case 'paragraph':
                        console.error('Paragraph links not implemented');
                        break;
                    case 'sentence':
                        SentencesEndpoint.fetch($scope.parentId).then(function(sentence) {
                            $scope.link = $state.href('post', {postId: sentence.post}) + '?sentence=' + sentence.id;
                            $scope.render();
                        });
                        break;
                };
            };
        },
        link: function(scope, element, attrs) {
            attrs.$observe('parentContentType', function(val) {
                scope.setParentContentType(val);
            });
            attrs.$observe('parentId', function(val) {
                scope.setParentId(val);
            });
            
            scope.render = function() { 
                element.attr('href', scope.link);    
            };
        }
    };
});
