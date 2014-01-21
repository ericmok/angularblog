module.exports = function(grunt) {
	grunt.initConfig({
		options: {
			banner: '/* My app <%= grunt.template.today() %> */'
		},
		clean: {
			app: ['dist/app/'],
			stylesheets: ['dist/css/'],
			tpl: ['dist/tpl/']
		},
		jshint: {
			all: ['src/app/*.js']
		},
		concat: {
			options: {
				separator: '\n\n'
			},
			dist: {
				src: ['src/common/services/*.js', 'src/common/directives/*.js', 'src/app/app.js'],
				dest: 'dist/js/app.js'
			}
		},
		copy: {
			tpl: {
				expand: true,
				src: 'src/app/*.tpl.html',
				dest: 'dist/tpl/',
				flatten: true
			}
		},
		less: {
			compile: {
				files: [{
					expand: true,
					src: ['src/less/*.less'],
					dest: 'dist/css/',
					ext: '.css',
					flatten: true
				}]
			}
		},
		watch: {
			app: {
				files: ['src/common/services/*.js', 'src/common/directives/*.js', 'src/app/*.js'],
				tasks: ['clean:app', 'concat']
			},
			tpl: {
				files: ['src/app/*.tpl.html'],
				tasks: ['clean:tpl', 'copy:tpl']
			},
			stylesheets: {
				files: ['src/less/*.less'],
				tasks: ['clean:stylesheets', 'less']
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-less');

	grunt.loadNpmTasks('grunt-contrib-copy');

	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-watch');
	
	grunt.registerTask('default', ['watch']);
}