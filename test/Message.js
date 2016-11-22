
var Long = require('long');
var Message = require('../src/Message.js');

var assert = require('assert');

var key = 'b34ddf8904bcfc454c6f06d33e600942c7ce8f75dd2d46532f263a6e56d83d34';
var encrypted = '5e1ef3f99e3a89060c43caacc0a05c15678ef8e9ba96f42e8dc64fa04dda759c2b0f4f8c34b91acf6f86e7';
var decrypted = '434e545250525459000000148322228e656758700000000000000000010000000000000000000466756761';

describe('Message', function() {
	it('should decrypt correctly', function() {
		assert.equal(Message.fromEncrypted(key, encrypted).toSerialized().toString('hex'), decrypted);
	});
	it('should encrypt correctly', function() {
		assert.equal(Message.fromSerialized(decrypted).toEncrypted(key).toString('hex'), encrypted);
	});
	it('should create Broadsact message correctly', function() {
		assert.equal(
			Message.createBroadcast('Hi, this is @visvirial!', 1234, 0.004321, Math.floor(new Date(2016, 10, 22, 12).getTime()/1000)).data.toString('hex'),
			'5833b4b04093480000000000000697e41748692c2074686973206973204076697376697269616c21');
	});
	it('should create Dividend message correctly', function() {
		assert.equal(
			Message.createDividend(10000000, 'PEPE', 'POKEMON').data.toString('hex'),
			'000000000098968000000000000411f2000000011e6246e9');
	});
	it('should create Issuance message correctly', function() {
		assert.equal(
			Message.createIssuance('VISVIRIAL', 100000000000, true, '@visvirial').data.toString('hex'),
			'0000040d5cba2a73000000174876e800010000000000000000000a4076697376697269616c');
	});
	it('should create Order message correctly', function() {
		assert.equal(
			Message.createOrder('VISVIRIAL', 1000000000, 'XCP', '123000000000', 1000).data.toString('hex'),
			'0000040d5cba2a73000000003b9aca0000000000000000010000001ca35f0e0003e80000000000000000');
	});
	it('should create Send message correctly', function() {
		assert.equal(
			Message.createSend('XCP', 100000000).data.toString('hex'),
			'00000000000000010000000005f5e100');
	});
});

