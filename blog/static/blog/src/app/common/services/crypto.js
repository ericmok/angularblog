angular.module('Crypto',[])

.factory('md5', function() {
    return {
        md5: function(val) {
            return CryptoJS.MD5(val);
        }
    };
});