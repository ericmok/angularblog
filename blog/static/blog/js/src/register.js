/* +------------------------------------------------+
 | Hey, fucker!                                 X |
 +------------------------------------------------+
 | Look at you,  Mr. I'm-too-good-for-G+! What's  |
 | the matter, don't have any friends? That must  |
 | be it, or you'd have a G+ account by now.      |
 |                                                |
 | +-------------------+    +-------------------+ |
 | |  Oh please may I  |    | I'm a giant loser | |
 | | have a G+ account |    |  with no friends  | |
 | +-------------------+    +-------------------+ |
 +------------------------------------------------+
 */


var app = angular.module("app", [])

app.factory("functional", function() {

	return {
		notEmptyString: function(val, length) {
			
			length = 1 || length;
			
			if (val.length < length) {
				return false;
			}
			return true;
		}
	};

})


app.controller("UsernameController", ["$scope", "$http", "functional", function($scope, $http, functional) {

	$scope.user = { username: "" };

}])

app.filter('toHTML', function() {
	return function(text) {
		return text + "FILTERED";
	};
})

app.directive("usernameField", function() {
	return {
		restrict: "E",
		require: "ngModel",
		scope: {
			myModel: "=ngModel",
			errormessageclass: "@",
			validmessageclass: "@",
			fieldname: "@"
		},

		// TODO: NG_BIND_HTML_UNSAFE...

		template: '<div> <input type="text" name="{{fieldname}}" style="{{style}}" ng-model="myModel"/> <div ng-if="waitingForAjax == true"><img src="/static/blog/images/ajax-loader.gif" /> {{VALIDATING_MESSAGE}}</div> <div ng-if="validationTimer == null"> <span ng-if="validity == false" class="{{errormessageclass}}">&#215; {{errorMessage}}</span> <span ng-if="validity == true" class="{{validmessageclass}}">&#10004; {{validMessage}}</span> </div> </div>',
		
		controller: function($scope, $http) {

			$scope.VALIDATING_MESSAGE = 'Validating...';

			$scope.INCORRECT_STYLE = "border: solid 1px #E0162B; outline: none; transition: border 0.5s;";
			$scope.CORRECT_STYLE = "border: solid 1px #2cc36b; outline: none; transition: border 0.5s;";
			$scope.WAITING_STYLE = "border: solid 1px #FFE400; outline: none; transition: border 0.5s;"; // #F1C40F
			$scope.NORMAL_STYLE = "border: solid 1px #AAA; outline: none; transition: border 0.5s;";
			$scope.style = $scope.NORMAL_STYLE;

			$scope.ERROR_MESSAGE_STYLE = "color: #E0162B";
			$scope.VALID_MESSAGE_STYLE = "color: #2cc36b";

			$scope.ERROR_USERNAME_REQUIRED = "A username is required!";
			$scope.ERROR_USERNAME_TOO_SHORT = "Username needs to be more than 4 characters long!";
			$scope.ERROR_USERNAME_TAKEN = "That username is already taken!";
			$scope.ERROR_USERNAME_INVALID_TOKENS = "Username can only include alphanumeric characters and dashes.";
			$scope.ERROR_NONE = "";

			$scope.VALID_OKAY = "Ok!";
			$scope.VALID_NONE = "";


			// Do not fire validation when the user just visited page and hasn't typed anything
			$scope.initiated = false;

			// For validating uniqueness
			$scope.REST_URL = "/blog/api/users/";

			// Timer that is set after user has finished typing and waits for response
			$scope.validationTimer = null;
			$scope.VALIDATION_DELAY = 500;

			// Set to true when ajax request is initiated. Sets to false when all validation code finishes.
			$scope.waitingForAjax = false;

			// Null validity means unknown
			$scope.validity = null;

			// Stores invalid usernames taken from REST api
			// TODO: Invalidate cache over time?
			$scope.cache = [];

			// Message to write when validation fails. There are hooks to edit this throughout validation cycle.
			$scope.errorMessage = "";


			function validationGenerator(message, validationCode) {
				
				return function(value) {
				
					this.message = message;

					var ret = validationCode(value);

					if (ret) {
						return true;
					}
					else {
						return false;
					}
				}
			}

			/** 
			Fires tests in order until it hits an error. Therefore, validators should be sorted by priority!
			*/
			function fireTests(target, validatorArguments) {
				
				//TODO: Test this

				var validators = Array.prototype.splice.call(arguments, 1);


				for (var i = 0; i < validators.length; i++) {

					var isValid = validators[i].call( validators[i], target );

					if ( !isValid ) {
						return validators[i].message;
					}
				}

				return null;
			}

			function setErrorMessage(value) {
				$scope.errorMessage = value;

				if ( value != $scope.ERROR_NONE ) {
					$scope.validity = false;
				}
			}

			function setValidMessage(value) {
				setErrorMessage( $scope.ERROR_NONE );
				$scope.validMessage = value;
				$scope.validity = true;
			}


			$scope.isInCache = function(value) {

				var ret = false;

				for (var i = 0; i < $scope.cache.length; i++) {
					if ( $scope.cache[i] == value ) {
						ret = true;
					}
				}

				return ret;
			}

			$scope.preValidation = function() {
				
				$scope.style = $scope.WAITING_STYLE;

			}

			$scope.postValidation = function() {

				$scope.validationTimer = null;
				$scope.waitingForAjax = false;

				$scope.updateStyles();
			}

			$scope.updateStyles = function() {

				if ( $scope.validity == true ) {

					$scope.style = $scope.CORRECT_STYLE;
				}

				else if ( $scope.validity == false ) {

					$scope.style = $scope.INCORRECT_STYLE;
				}

				else { // validity == null

					$scope.style = $scope.WAITING_STYLE;
				}

				if ( $scope.$root.$$phase != '$apply' && $scope.$root.$$phase != '$digest' ) {
					$scope.$apply();
				}
			}

			// Wrapper for AJAX
			$scope.getAJAX = function(value) {
				return $http.get( $scope.REST_URL + value );
			}


			// Validation such as regex to run before we call AJAX validation
			$scope.nonAJAXValidation = function(value) {

				var validTokensValidator = validationGenerator( $scope.ERROR_USERNAME_INVALID_TOKENS, function(value) {

					var regExp = /.*[^A-Za-z0-9\_\-].*/;

					// error becomes the string if invalid chars are detected
					var error = regExp.test(value);

					if ( error ) {
						return false;
					}
					else {
						return true;
					}
				});


				var emptyValidator = validationGenerator( $scope.ERROR_USERNAME_REQUIRED, function(value) {

					if ( value.length < 1 ) {
						return false;
					}
					else {
						return true;
					}
				});

				var lengthValidator = validationGenerator( $scope.ERROR_USERNAME_TOO_SHORT, function(value) {

					if ( value.length <= 3 ) {
						return false;
					}
					else {
						return true;
					}
				});

				//console.log("FIRE TEST: ", fireTests(value, validTokensValidator));

				var error = fireTests(value, validTokensValidator, emptyValidator, lengthValidator);				
				return error;
			}


			// The actual AJAX request goes here
			$scope.triggerValidation = function(value) {

				var nonAjaxError = $scope.nonAJAXValidation(value);

				if ( nonAjaxError != null )  {
					
					setErrorMessage(nonAjaxError);

					$scope.postValidation();
				}
				else {

					// CACHE CHECK	
					if ( $scope.isInCache(value) ) {

						setErrorMessage( $scope.ERROR_USERNAME_TAKEN );
						$scope.postValidation();
					}		
					else {

						$scope.waitingForAjax = true;

						$scope.getAJAX(value).success(function(data, status, headers, config) {

							console.log("Username Found.");

							// Validity is false when username exists - we want a unique username

							setErrorMessage( $scope.ERROR_USERNAME_TAKEN );

							$scope.cache.push( value );

							$scope.postValidation();

						}).error(function(data, status, headers, config){

							console.log("Username Not Found.");

							setValidMessage( $scope.VALID_OKAY );

							$scope.postValidation();
						});
					} // End cache else
				}
			}


			// Timer wrapper for validation. 
			// PostCondition: Sets validationTimer to null when task is finished!
			$scope.validate = function(value) {

				// Skip first validation call
				if ( !$scope.initiated ) {
					$scope.initiated = true;
					return;
				}
					
				$scope.validity = null; // To be resolved after timeout function finishes
				$scope.updateStyles();

				if ( $scope.validationTimer != null ) {

					clearTimeout( $scope.validationTimer );
				}

				$scope.validationTimer = setTimeout(function() {

					$scope.preValidation();
					$scope.triggerValidation(value);
				
				}, $scope.VALIDATION_DELAY);
			}
		},		

		link: function(scope, element, attrs, ngModelCtrl) {

			scope.$watch("myModel", function(value) {

				console.log("Watch");
				scope.validate(value);
			});

		}
	}
});


app.directive("uniqueUsername", function() {	

	return {
		require: "ngModel",
		restrict: "A",
		//template: "<input type='text' />" +
		//		  "<div>{{ valid | toHTML }}<img src='/static/blog/images/ajax-loader.gif' /></div>",

		controller: function($scope, $http) {

			$scope.validating = false;
			$scope.timer = null;
			$scope.cache = [];

			function ajaxIsAvailable() {
				return timer == null;
			}

			function getAJAX(value) {
				return $http.get("/blog/api/users/" + value);
			}


			function isInCache(value) {

				var ret = false;

				for (var i = 0; i < $scope.cache.length; i++) {
					if ( $scope.cache[i] == value ) {
						ret = true;
					}
				}

				return ret;
			}

			function handleValidation(value, ngModelCtrl) {
			
				if ( isInCache(value) ) {
					ngModelCtrl.$setValidity('unique', false);
				}
				else {

					getAJAX(value).success(function(data, status, headers, config) {

						ngModelCtrl.$setValidity('unique', false);
						console.log("Username Found.");


						setValidating(false);

						$scope.cache.push( value );

					}).error(function(data, status, headers, config){

						ngModelCtrl.$setValidity('unique', true);
						console.log("Username Not Found.");

						setValidating(false);
					});
				}
				
			}

			function setValidating(value) {
				$scope.validating = value;
			}


			$scope.validate = function(value, ngModelCtrl) {
				
				setValidating(true);

				if ( $scope.timer != null ) {
					clearTimeout($scope.timer);
				}

				$scope.timer = setTimeout(function() {
					handleValidation(value, ngModelCtrl);
					$scope.timer = null;
				}, 500);
			}

			$scope.represent = function(value, ngModelCtrl) {
				
				if (value === true) {
					ngModelCtrl.$setValidity('unique', true);
				}
				else {
					ngModelCtrl.$setValidity('unique', false);
				}
			}
		},
		link: function(scope, element, attrs, ngModelCtrl) {

			scope.$watch(attrs.ngModel, function(value) {
				//scope.note(value);
				scope.validate(value, ngModelCtrl);
			});

			//scope.$watch("valid", function(value) {
				//scope.note("VALID: " + value);
//				scope.valid = value;
//			});
		}
	};

})


/* CUTESIE
				$scope.invalidateCache = function() {

				console.log("INVALIDATE");
				if ($scope.cache.length > 0) {
					Array.prototype.splice.call( $scope.cache, 0, 1 );
					console.log( $scope.cache );
				}
			}

			$scope.invalidateCacheLoop = function() {
				setInterval( function() { $scope.invalidateCache() }, 12000 );
			}

			$scope.invalidateCacheLoop();

			$scope.available = true;
			$scope.nonHandledRequests = [];

			$scope.cache = [];

			$scope.valid = false;

			$scope.validate = function(value, ngModelCtrl) {

				console.log("VALIDATE");

				var inCache = false;

				for (var i = 0; i < $scope.cache.length; i++) {
					if ( $scope.cache[i].key == value ) {
						$scope.valid = $scope.cache[i].valid;
						inCache = true;
					}
				}

				if ( !inCache ) {
	
					$scope.nonHandledRequests.push(value);	

					while ( $scope.nonHandledRequests.length > 0 ) {

						var value = $scope.nonHandledRequests.pop();

						$http.get("/blog/api/users/" + value).success(function(data, status, headers, config) {

							$scope.valid = false; // Should be unique

							$scope.cache.push({'key': value, valid: false});
							$scope.available = true;

							console.log("CACHE: " + $scope.cache);

							ngModelCtrl.$setValidity('unique', false);

						}).error(function(data, status, headers, config) {

							$scope.valid = true; 

							$scope.cache.push({'key': value, valid: true});
							$scope.available = true;

							ngModelCtrl.$setValidity('unique', true);

							console.log("CACHE: " + $scope.cache);

						});
					}

				}

			};

			$scope.note = function(val) {
				console.log(val);
			};
*/