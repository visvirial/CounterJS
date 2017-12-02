
var Long = require('long');
var util = require('../src/util.js');
var Message = require('../src/Message.js');

var assert = require('assert');

describe('util', function() {
	it('should process ARC4 encryption correctly', function() {
		var key = Buffer.from('b34ddf8904bcfc454c6f06d33e600942c7ce8f75dd2d46532f263a6e56d83d34', 'hex');
		var encrypted = Buffer.from('5e1ef3f99e3a89060c43caacc0a05c15678ef8e9ba96f42e8dc64fa04dda759c2b0f4f8c34b91acf6f86e7', 'hex');
		var decrypted = Buffer.from('434e545250525459000000148322228e656758700000000000000000010000000000000000000466756761', 'hex');
		assert.deepEqual(util.arc4(key, encrypted), decrypted);
	});
	it('should generate an address from a mnemonic code', function() {
		var mnemonic = 'spot continue stumble wipe crimson cause sword school blur music sob through';
		var priv = util.mnemonicToPrivateKey(mnemonic, 0);
		assert.equal(priv, 'L5WSPy4TdW1x7HAxwRC2QMzpLfAvJD3cu6un9TSr6tA5yRbXqSa7');
	});
	it('should recover numeric asset name from ID', function() {
		assert.equal(util.assetIdToName(Long.fromString('ac59c7c2fd194d10', true, 16)), 'A12419177087734730000');
	});
	it('should recover alphabetic asset name from ID', function() {
		assert.equal(util.assetIdToName(Long.fromString('0000040d5cba2a73', true, 16)), 'VISVIRIAL');
	});
	it('should recover asset ID from numeric asset name', function() {
		assert(util.assetNameToId('A12419177087734730000').equals(Long.fromString('ac59c7c2fd194d10', true, 16)));
	});
	it('should recover asset ID from alphabetic asset name', function() {
		assert(util.assetNameToId('VISVIRIAL').equals(Long.fromString('0000040d5cba2a73', true, 16)));
	});
	it('should build a transaction', function() {
		var inputs = [{
			txid: '990e1388e6f16008fc33b6d945bcf9981c87d1d339ef9c685fb9305309b946a8',
			vout: 1,
		}];
		var message = Message.createSend(util.assetNameToId('VISVIRIAL'), Long.fromString('100000000', true));
		var change = {
			address: 'mtGffL93zFs3gdhcFo5DGkCQxSJFfdttYa',
			value: 99925290,
		};
		var rawtx = util.buildTransaction(inputs, 'msTBjkycK1ZmPq1EBkQUwvSYq2fm5KrpJJ', message, change, 'testnet', true/*oldStyle*/);
		assert.deepEqual(rawtx.toString('hex'), '0100000001a846b9095330b95f689cef39d3d1871c98f9bc45d9b633fc0860f1e688130e990100000000ffffffff0336150000000000001976a91482eb113f0455107b1788093844f3027595b0b44888ac00000000000000001e6a1c6ad7042493a8749786f99d122f7aaa23dd5ac4d90d98acad76d9a7a92abdf405000000001976a9148be5ed53f1529e493b4c06f945f805b31afb400388ac00000000');
	});
});

