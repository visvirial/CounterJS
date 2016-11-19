
var files = [
	'Message',
	'util',
];

module.exports = {};

for(var f of files) {
	module.exports[f] = require('./'+f+'.js');
}

