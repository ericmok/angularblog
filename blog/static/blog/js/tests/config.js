module.exports = function(config) {
	config.set({
		basePath: '.',
		frameworks: ['jasmine'],
		files: ['test.js'],
		browsers: ['Chrome', 'Firefox'],
		autoWatch = true,
		port = 999
	})
}