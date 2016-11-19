
var Long = require('long');
var Message = require('../src/Message.js');

var assert = require('assert');

var key = Buffer.from('b34ddf8904bcfc454c6f06d33e600942c7ce8f75dd2d46532f263a6e56d83d34', 'hex');
var encrypted = Buffer.from('5e1ef3f99e3a89060c43caacc0a05c15678ef8e9ba96f42e8dc64fa04dda759c2b0f4f8c34b91acf6f86e7', 'hex');
var decrypted = Buffer.from('434e545250525459000000148322228e656758700000000000000000010000000000000000000466756761', 'hex');

describe('Message', function() {
	it('should decrypt correctly', function() {
		assert.deepEqual(Message.fromEncrypted(key, encrypted).toSerialized(), decrypted);
	});
	it('should encrypt correctly', function() {
		assert.deepEqual(Message.fromSerialized(decrypted).toEncrypted(key), encrypted);
	});
	it('should create Send message correctly', function() {
		var asset_id = 1;
		var value = 100000000;
		assert.deepEqual(
			Message.createSend(new Long(asset_id), new Long(value)).data,
			Buffer.from('00000000000000010000000005f5e100', 'hex'));
	});
});

