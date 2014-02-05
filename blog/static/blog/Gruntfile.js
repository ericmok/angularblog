/*
Maintenance Procedure:
For each page in the app, you have to add a mapping to the files config for concat:pages
*/

module.exports = function(grunt) {
	grunt.initConfig({
		options: {
			banner: '/* My app <%= grunt.template.today() %> */'
		},
		clean: {
			app: ['dist/app/'],
			stylesheets: ['dist/css/'],
			all: ['dist/']
		},
		jshint: {
			all: ['src/app/*.js']
		},
		concat: {
			options: {
				separator: '\n\n /* *** */ \n\n'
			},
			app: {
				src: ['src/app/main.js', 'src/app/common/services/*.js', 'src/app/common/directives/*.js'],
				dest: 'dist/app/main.js'
			},
			pages: {
				files: [{
					src: 'src/app/latest/*.js',
					dest: 'dist/app/latest/latest.js',
				}, {
					src: 'src/app/createblog/*.js',
					dest: 'dist/app/createblog/createblog.js'
				}, {
					src: 'src/app/blog/*.js',
					dest: 'dist/app/blog/blog.js'
				}, {
					src: 'src/app/post/*.js',
					dest: 'dist/app/post/post.js'
				}, {
					src: 'src/app/createpost/*.js',
					dest: 'dist/app/createpost/createpost.js'
				}]
			}
		},
		copy: {
			tpl: {
				expand: true,
				cwd: 'src/app/',
				src: '**/*.tpl.html',
				dest: 'dist/app/',
				flatten: false
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
				files: ['src/app/main.js', 'src/app/**/*'],
				tasks: ['clean:app', 'concat', 'copy:tpl']
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