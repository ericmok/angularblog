describe('Register Form Test', function() {
    
    var $compile, $rootScope;
    
    beforeEach(module('RegisterForm'));
    
    beforeEach(function() {    
        inject(function(__$compile__, __$rootScope__) {
            $compile = __$compile__;
            $rootScope = __$rootScope__;
        });
    });
    
    it('register form compiles', function() {
        
        var html = $compile( angular.element('<register-form></register-form>') )($rootScope);
        console.log('html', html);
        console.log('HTML');
        expect(false).toBe(true);
    });
});
