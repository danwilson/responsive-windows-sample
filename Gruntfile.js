module.exports = function(grunt) {

  grunt.initConfig({

    pkg: grunt.file.readJSON('package.json'),

    sass: {
      dist: {
        options: {
          style: 'compressed',//expanded',
        },
        files: {
          'Responsive/Responsive/css/app.css': 'Responsive/Responsive/css/app.scss'
        }
      }
    },

    concat: {
      dist: {
        src: [
          'Responsive/Responsive/css/*.scss',
          'Responsive/Responsive/pages/*/*.scss'
        ],
        dest: 'Responsive/Responsive/css/app.scss'
      }
    },

    watch: {
      css: {
        files: ['Responsive/Responsive/css/*.scss', 'Responsive/Responsive/pages/*/*.scss'],
        tasks: ['concat', 'sass'],
        options: {
          spawn: false,
        }
      },
    },

    connect: {
      server: {
        options: {
          port: 8088,
          base: './'
        }
      }
    },

  });

  require('load-grunt-tasks')(grunt);

  // Default Task is basically a rebuild
  grunt.registerTask('default', ['concat', 'sass']);
  grunt.registerTask('dev', ['watch']);

};