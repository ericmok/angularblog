angular.module('RegisterForm', ['UniqueSource', 'Urls', 'Crypto'])

.directive('registerForm', function(urls) {
    return {
        restrict: 'EA',
        template: 
            '<form>' +
                '<input type="text" ng-model="username" ng-minLength="4" unique-source=" urls.users " class="form-control" placeholder="Enter a unique username" />' +
                '<input type="password" ng-model="password" class="form-control" ng-minLength="4" placeholder="Password" />' +
                '<button class="btn btn-success" ng-click="createAccount()">Create Account</button>' +
            '</form>',
        scope: {
            success: '&'
        },
        controller: function($scope, $http, urls, md5) {
            $scope.username = '';
            $scope.password = '';
            
            $scope.calculating = false;
            
            $scope.hashCash = function() {false
                $scope.calculating = true;
                
                var counter = 0;
                var hash = 'aa';
                
                while (true) {
                    counter++;
                    
                    hash = [$scope.username, counter].join('');
                    hash = md5.md5(hash).toString();
                    console.log('hash', hash);
                    console.log(hash.charAt(0), hash.charAt(1));
                    
                    if ((hash.charAt(0) === '0') && (hash.charAt(1) === '0')) {
                        $scope.calculating = false;
                        return {
                            counter: counter,
                            hash: hash
                        };
                    }
                }
            };
            
            $scope.createAccount = function() {
                
                var hashCash = $scope.hashCash();
                
                $http({
                    method: 'POST',
                    url: urls.users,
                    data: {
                        username: $scope.username,
                        password: $scope.password,
                        unique: 'username ' + hashCash.counter + ' ' + hashCash.hash
                    }
                }).then(function() {
                    $scope.success();
                    console.log('success');
                }, function() {
                    console.log('fail');
                });
            };
        },
        link: function(scope, element, attrs) {
        
        }
    };
});