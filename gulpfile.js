'use strict';

const pkg = require('./package');
const gulp = require('gulp');
const jshint = require('gulp-jshint');
const stylish = require('jshint-stylish');
const browserify = require('browserify');
const source = require('vinyl-source-stream');
const del = require('del');
const uglify = require('gulp-uglify');
const pump = require('pump');
const babelify = require('babelify');
const rename = require('gulp-rename');

gulp.task('clean', function(cb) {
	del(['dist'], cb);
});

gulp.task('jshint', function() {
	return gulp
		.src(['./src/*.js', './sample/*.js'])
		.pipe(jshint(pkg.jshintConfig))
		.pipe(jshint.reporter(stylish));
});

gulp.task('browser:uncompressed', function() {
	return browserify({debug: true})
		.require('./src/index.js', {expose: 'counterjs'})
		.transform(babelify)
		.bundle()
		.pipe(source('counterjs.js'))
		.pipe(gulp.dest('dist'));
});

gulp.task('browser:compressed', ['browser:uncompressed'], function(cb) {
	pump([
		gulp.src('./dist/counterjs.js'),
		uglify(),
		rename('counterjs.min.js'),
		gulp.dest('./dist'),
	], cb);
});

gulp.task('browser', ['browser:compressed']);

