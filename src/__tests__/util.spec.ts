
import Long from 'long';

import * as util from '../util';
import Message from '../Message';

test('should process ARC4 encryption correctly', () => {
	const key = Buffer.from('b34ddf8904bcfc454c6f06d33e600942c7ce8f75dd2d46532f263a6e56d83d34', 'hex');
	const encrypted = Buffer.from('5e1ef3f99e3a89060c43caacc0a05c15678ef8e9ba96f42e8dc64fa04dda759c2b0f4f8c34b91acf6f86e7', 'hex');
	const decrypted = Buffer.from('434e545250525459000000148322228e656758700000000000000000010000000000000000000466756761', 'hex');
	expect(util.arc4(key, encrypted)).toEqual(decrypted);
});

test('should generate an address from a mnemonic code', () => {
	const mnemonic = 'spot continue stumble wipe crimson cause sword school blur music sob through';
	const priv = util.mnemonicToPrivateKey(mnemonic, 0);
	expect(priv).toBe('L5WSPy4TdW1x7HAxwRC2QMzpLfAvJD3cu6un9TSr6tA5yRbXqSa7');
});

test('should recover numeric asset name from ID', () => {
	expect(util.assetIdToName(Long.fromString('ac59c7c2fd194d10', true, 16))).toBe('A12419177087734730000');
});

test('should recover alphabetic asset name from ID', () => {
	expect(util.assetIdToName(Long.fromString('0000040d5cba2a73', true, 16))).toBe('VISVIRIAL');
});

test('should recover asset ID from numeric asset name', () => {
	expect(util.assetNameToId('A12419177087734730000').equals(Long.fromString('ac59c7c2fd194d10', true, 16))).toBeTruthy();
});

test('should recover asset ID from alphabetic asset name', () => {
	expect(util.assetNameToId('VISVIRIAL').equals(Long.fromString('0000040d5cba2a73', true, 16))).toBeTruthy();
});

test('should build a transaction', () => {
	const inputs = [{
		txid: '990e1388e6f16008fc33b6d945bcf9981c87d1d339ef9c685fb9305309b946a8',
		vout: 1,
	}];
	const message = Message.createSend('VISVIRIAL', Long.fromString('100000000', true));
	const change = {
		address: 'mtGffL93zFs3gdhcFo5DGkCQxSJFfdttYa',
		value: 99925290,
	};
	const rawtx = util.buildTransaction(inputs, 'msTBjkycK1ZmPq1EBkQUwvSYq2fm5KrpJJ', message, change, 'testnet', true/*oldStyle*/);
	expect(rawtx.toString('hex')).toBe('0100000001a846b9095330b95f689cef39d3d1871c98f9bc45d9b633fc0860f1e688130e990100000000ffffffff0336150000000000001976a91482eb113f0455107b1788093844f3027595b0b44888ac00000000000000001e6a1c6ad7042493a8749786f99d122f7aaa23dd5ac4d90d98acad76d9a7a92abdf405000000001976a9148be5ed53f1529e493b4c06f945f805b31afb400388ac00000000');
});

test('should accept Monacoin network', () => {
	expect((<any>util._getBitcoinJSNetwork('monacoin')).name).toBe('Monacoin');
});

test('should be kept backward compatibilty for _getBitcoinJSNetwork()', () => {
	expect(util._getBitcoinJSNetwork().pubKeyHash).toBe(0);
	expect(util._getBitcoinJSNetwork('mainnet').pubKeyHash).toBe(0);
	expect(util._getBitcoinJSNetwork('testnet').pubKeyHash).toBe(0x6f);
});

test('should support BTC/XCP on Counterparty network.', () => {
	expect(util.assetNameToId('BTC').equals(0)).toBeTruthy();
	expect(util.assetNameToId('XCP').equals(1)).toBeTruthy();
	expect(util.assetIdToName(Long.fromInt(0))).toBe('BTC');
	expect(util.assetIdToName(Long.fromInt(1))).toBe('XCP');
});

test('should support MONA/XMP on Monaparty network.', () => {
	expect(util.assetNameToId('MONA', 'Monacoin').equals(0)).toBeTruthy();
	expect(util.assetNameToId('XMP',  'Monacoin').equals(1)).toBeTruthy();
	expect(util.assetIdToName(Long.fromInt(0), 'Monacoin')).toBe('MONA');
	expect(util.assetIdToName(Long.fromInt(1), 'Monacoin')).toBe('XMP');
});

