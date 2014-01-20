module.exports = function(grunt) {
	grunt.initConfig({
		options: {
			banner: '/* My app <%= grunt.template.today() %> */'
		},
		clean: ['dist/'],
		jshint: {
			all: ['src/app/*.js']
		},
		concat: {
			options: {
				separator: '\n\n'
			},
			dist: {
				src: ['src/app/*.js'],
				dest: 'dist/app.js'
			}
		},
		less: {
			compile: {
				files: [{
					expand: true,
					src: ['src/less/*.less'],
					dest: 'dist/',
					ext: '.less',
					flatten: true
				}]
			}
		},
		watch: {
			app: {
				files: ['src/app/*.js'],
				tasks: ['clean', 'concat']
			},
			stylesheets: {
				files: ['src/less/*.less'],
				tasks: ['less']
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-less');

	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-watch');
	
	grunt.registerTask('default', ['watch']);
}