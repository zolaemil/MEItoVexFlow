module.exports = function(grunt) {

  'use strict';

  // Load plugins. 
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-concat');

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    uglify: {
      dist: {
        options: {
          mangle: true,
          banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'   
        },   
        files: { 'dist/<%= pkg.name %>.min.js': [ 'dist/<%= pkg.name %>.js' ] }
      }
    },

    concat: {
      bower_js: {
        options: {
          separator: ';'
        },
        src: ['src/meilib.js',
              'src/Converter.js',
              'src/EventLink.js',
              'src/EventReference.js',
              'src/Hyphenation.js',
              'src/LinkCollections.js',
              'src/Measure.js',
              'src/MEI2VF.js',
              'src/tables.js',
              'src/StaffInfo.js',
              'src/StaveConnector.js',
              'src/StaveVoices.js',
              'src/System.js',
              'src/SystemInfo.js',
              'src/vexflow-overrides.js',
              'src/Util.js',
              'src/Interface.js'],
        dest: 'dist/meitovexflow.js'
      }
    },

    connect: {
      server: {
        options: {
          port: 8000
        }
      }
    },

    watch: {
      scripts: {
        files: ['src/*.js'],
        tasks: ['concat', 'uglify'], 
        options: {
          livereload: true
        }
      }
    },

  });


  // Tasks.
  grunt.registerTask('default', ['concat', 'uglify']);
  grunt.registerTask('run', ['connect', 'watch']);
}