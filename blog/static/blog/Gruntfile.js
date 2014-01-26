module.exports = function(grunt) {
	grunt.initConfig({
		options: {
			banner: '/* My app <%= grunt.template.today() %> */'
		},
		clean: {
			app: ['dist/js/app'],
			common: ['dist/js/common'],
			stylesheets: ['dist/css/'],
			tpl: ['dist/tpl/'],
			all: ['dist/']
		},
		jshint: {
			all: ['src/app/*.js']
		},
		concat: {
			options: {
				separator: '\n\n'
			},
			common: {
				src: ['src/common/services/*.js', 'src/common/directives/*.js'],
				dest: 'dist/js/common/common.js'
			},
			app: {
				src: ['src/app/app.js'],
				dest: 'dist/js/app/app.js'
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
			common: {
				files: ['src/common/services/*.js', 'src/common/directives/*.js'],
				tasks: ['clean:common', 'concat:common']
			},
			app: {
				files: ['src/app/*.js'],
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
	
	grunt.registerTask('default', ['clean:all', 'concat', 'copy:tpl', 'less', 'watch']);
}