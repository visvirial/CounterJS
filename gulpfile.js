'use strict';

const pkg = require('./package');
const gulp = require('gulp');
const jshint = require('gulp-jshint');
const stylish = require('jshint-stylish');

gulp.task('jshint', function() {
	return gulp
		.src(['./src/*.js', './sample/*.js'])
		.pipe(jshint(pkg.jshintConfig))
		.pipe(jshint.reporter(stylish));
});

