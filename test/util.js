
var Long = require('long');
var util = require('../src/util.js');

var assert = require('assert');

describe('util', function() {
	it('should process ARC4 encryption correctly', function() {
		var key = Buffer.from('b34ddf8904bcfc454c6f06d33e600942c7ce8f75dd2d46532f263a6e56d83d34', 'hex');
		var encrypted = Buffer.from('5e1ef3f99e3a89060c43caacc0a05c15678ef8e9ba96f42e8dc64fa04dda759c2b0f4f8c34b91acf6f86e7', 'hex');
		var decrypted = Buffer.from('434e545250525459000000148322228e656758700000000000000000010000000000000000000466756761', 'hex');
		assert.deepEqual(util.arc4(key, encrypted), decrypted);
	});
	it('should recover asset name from ID', function() {
		var asset_id = Long.fromString('0000040d5cba2a73', true, 16);
		assert.equal(util.assetIdToName(asset_id), 'VISVIRIAL');
	});
});

