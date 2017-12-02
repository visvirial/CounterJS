
var Long = require('long');
var Message = require('../src/Message.js');

var assert = require('assert');

var key_old = 'b34ddf8904bcfc454c6f06d33e600942c7ce8f75dd2d46532f263a6e56d83d34';
var encrypted_old = '5e1ef3f99e3a89060c43caacc0a05c15678ef8e9ba96f42e8dc64fa04dda759c2b0f4f8c34b91acf6f86e7';
var decrypted_old = '434e545250525459000000148322228e656758700000000000000000010000000000000000000466756761';
var key_new = 'df6f0de63958079f284cc512ecfd843437e40b58bf478b87d864f3f5f4dee20e';
var encrypted_new = '410a095f92654317ca6694841300849092a6f1043ddbd8980e269b4417cf2d2b5b0df03afc164ae865896e';
var decrypted_new = '434e545250525459148f78715211fdc7f800000002540be40001000000000000000000077664677275636b';

describe('Message', function() {
	it('should decrypt correctly (old)', function() {
		assert.equal(Message.fromEncrypted(key_old, encrypted_old).toSerialized(true).toString('hex'), decrypted_old);
	});
	it('should encrypt correctly (old)', function() {
		assert.equal(Message.fromSerialized(decrypted_old).toEncrypted(key_old, true).toString('hex'), encrypted_old);
	});
	it('should decrypt correctly (new)', function() {
		assert.equal(Message.fromEncrypted(key_new, encrypted_new).toSerialized().toString('hex'), decrypted_new);
	});
	it('should encrypt correctly (new)', function() {
		assert.equal(Message.fromSerialized(decrypted_new).toEncrypted(key_new).toString('hex'), encrypted_new);
	});
	it('should create Broadsact message correctly', function() {
		assert.equal(
			Message.createBroadcast('Hi, this is @visvirial!', 1234, 432100, Math.floor(new Date('2016-11-22 12:00:00 GMT').getTime()/1000)).data.toString('hex'),
			'583433404093480000000000000697e41748692c2074686973206973204076697376697269616c21');
	});
	it('should create Cancel message correctly', function() {
		assert.equal(
			Message.createCancel('cbe3e81d39617f035835e96d03c1c5673a97c45bce95809ccea79e18581a75fc').data.toString('hex'),
			'cbe3e81d39617f035835e96d03c1c5673a97c45bce95809ccea79e18581a75fc');
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

