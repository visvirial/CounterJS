
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
	it('should create Issuance message correctly', function() {
		var asset_id = Long.fromString('0000040d5cba2a73', true, 16);
		var quantity = Long.fromString('100000000000', true);
		assert.deepEqual(
			Message.createIssuance(asset_id, quantity, true, false, 0, 0, '@visvirial').data,
			Buffer.from('0000040d5cba2a73000000174876e800010000000000000000000a4076697376697269616c', 'hex'));
	});
	it('should create Order message correctly', function() {
		var give_id = Long.fromString('0000040d5cba2a73', true, 16);
		var give_quantity = Long.fromString('1000000000', true);
		var get_id = Long.fromInt(1);
		var get_quantity = Long.fromString('123000000000', true);
		var expiration = 1000;
		var fee_required = Long.fromInt(0);
		assert.deepEqual(
			Message.createOrder(give_id, give_quantity, get_id, get_quantity, expiration, fee_required).data,
			Buffer.from('0000040d5cba2a73000000003b9aca0000000000000000010000001ca35f0e0003e80000000000000000', 'hex'));
	});
	it('should create Send message correctly', function() {
		var asset_id = new Long (1);
		var quantity = Long.fromString('100000000');
		assert.deepEqual(
			Message.createSend(asset_id, quantity).data,
			Buffer.from('00000000000000010000000005f5e100', 'hex'));
	});
});

