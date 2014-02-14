angular.module('RegisterForm', ['UniqueSource', 'Urls', 'Crypto', 'Security', 'PasswordConfirm'])

.directive('registerForm', function(urls) {
    return {
        restrict: 'EA',
        template: 
            '<form name="registerForm" ng-submit="createAccount()" class="register-form">' +
                '<h3>Register</h3>' +
                '<input type="text" name="username" ng-model="username" ng-minlength="4" ng-pattern="/\w*/" ng-required unique-source="' + 
                urls.users + 
                '" class="form-control" placeholder="Enter a unique username" />' +
                '<input type="password" name="password" ng-model="password" class="form-control" ng-minlength="5" ng-required placeholder="Enter a password..." />' +
                '<input type="password" name="passwordConfirm" ng-model="passwordConfirm" class="form-control" password-confirm="{{password}}" placeholder="Type your password a second time..." ng-required />' +
                '<div ng-if="registerForm.username.$error.minlength">Username needs to be at least 4 characters long</div>' +
                '<div ng-if="registerForm.username.$error.uniqueSource">That username is already taken!</div>' +
                '<div ng-if="registerForm.password.$error.minlength">That password is too short!</div>' +
                '<div ng-if="registerForm.passwordConfirm.$error">{{registerForm.passwordConfirm.$error}}</div>' +
                '<div ng-if="calculating"><img src=\"/static/blog/assets/ajax-loader.gif\" /></div>' +
                '<button class="btn btn-success" ng-hide="calculating">Create Account</button>' +
            '</form>',
        scope: {
            success: '&'
        },
        controller: function($scope, $http, urls, md5, auth) {
            $scope.username = '';
            $scope.password = '';
            $scope.passwordConfirm = '';
            
            $scope.calculating = false;
            
//            $scope.isValid = function(formCtrl) {
//                for (var item in formCtrl.username.$error) {
//                    if (formCtrl.username.$error.hasOwnProperty(item) {
//                        if (formCtrl.username.$error[item] === true) {
//                            return false;
//                        }
//                    }
//                }
//                for (var item in formCtrl.password.$error) {
//                    if (formCtrl.password.$error.hasOwnProperty(item) {
//                        if (formCtrl.password.$error[item] === true) {
//                            return false;
//                        }
//                    }
//                }
//                return true;
//            };
            
            $scope.hashCash = function() {
                
                var counter = 0;
                var hash = 'aa';
                
                while (true) {
                    counter++;
                    
                    hash = [$scope.username, counter].join('');
                    hash = md5.md5(hash).toString();
                    //console.log('hash', hash);
                    //console.log(hash.charAt(0), hash.charAt(1));
                    
                    if ((hash.charAt(0) === '0') && (hash.charAt(1) === '0') && (hash.charAt(2) === '0')) {
                        
                        return {
                            counter: counter,
                            hash: hash
                        };
                    }
                }
            };
            
            $scope.createAccount = function() {
                
                $scope.calculating = true;
                var hashCash = $scope.hashCash();
                
                $http({
                    method: 'POST',
                    url: urls.users,
                    data: {
                        username: $scope.username,
                        password: $scope.password
                    },
                    headers: {
                        unique: 'username ' + hashCash.counter + ' ' + hashCash.hash
                    }
                }).then(function(data) {
                    $scope.success();
                    $scope.calculating = false;
                    console.log('Create user success');
                    $scope.success({username: $scope.username, password: $scope.password});
                }, function() {
                    $scope.calculating = false;
                    console.log('Create user fail');
                });
            };
        },
        link: function(scope, element, attrs) {
        
        }
    };
});