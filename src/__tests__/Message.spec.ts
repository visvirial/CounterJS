
import Long from 'long';
import Message from '../Message';
import * as util from '../util';

const key_old       = Buffer.from('b34ddf8904bcfc454c6f06d33e600942c7ce8f75dd2d46532f263a6e56d83d34', 'hex');
const encrypted_old = Buffer.from('5e1ef3f99e3a89060c43caacc0a05c15678ef8e9ba96f42e8dc64fa04dda759c2b0f4f8c34b91acf6f86e7', 'hex');
const decrypted_old = Buffer.from('434e545250525459000000148322228e656758700000000000000000010000000000000000000466756761', 'hex');
const key_new       = Buffer.from('df6f0de63958079f284cc512ecfd843437e40b58bf478b87d864f3f5f4dee20e', 'hex');
const encrypted_new = Buffer.from('410a095f92654317ca6694841300849092a6f1043ddbd8980e269b4417cf2d2b5b0df03afc164ae865896e', 'hex');
const decrypted_new = Buffer.from('434e545250525459148f78715211fdc7f800000002540be40001000000000000000000077664677275636b', 'hex');

test('should decrypt correctly (old)', () => {
	expect(Message.fromEncrypted(key_old, encrypted_old).toSerialized(true)).toEqual(decrypted_old);
});

test('should encrypt correctly (old)', () => {
	expect(Message.fromSerialized(decrypted_old).toEncrypted(key_old, true)).toEqual(encrypted_old);
});

test('should decrypt correctly (new)', () => {
	expect(Message.fromEncrypted(key_new, encrypted_new).toSerialized()).toEqual(decrypted_new);
});

test('should encrypt correctly (new)', () => {
	expect(Message.fromSerialized(decrypted_new).toEncrypted(key_new)).toEqual(encrypted_new);
});

test('should create Broadsact message correctly', () => {
	expect(Message.createBroadcast('Hi, this is @visvirial!', 1234, 432100, Math.floor(new Date('2016-11-22 12:00:00 GMT').getTime()/1000)).data)
		.toEqual(Buffer.from('583433404093480000000000000697e41748692c2074686973206973204076697376697269616c21', 'hex'));
});

test('should create Cancel message correctly', () => {
	expect(Message.createCancel(Buffer.from('cbe3e81d39617f035835e96d03c1c5673a97c45bce95809ccea79e18581a75fc', 'hex')).data)
		.toEqual(Buffer.from('cbe3e81d39617f035835e96d03c1c5673a97c45bce95809ccea79e18581a75fc', 'hex'));
});

test('should create Dividend message correctly', () => {
	expect(Message.createDividend(10000000, 'PEPE', 'POKEMON').data)
		.toEqual(Buffer.from('000000000098968000000000000411f2000000011e6246e9', 'hex'));
});

test('should create Issuance message correctly', () => {
	expect(Message.createIssuance('VISVIRIAL', 100000000000, true, '@visvirial').data)
		.toEqual(Buffer.from('0000040d5cba2a73000000174876e800010000000000000000000a4076697376697269616c', 'hex'));
});

test('should create Order message correctly', () => {
	expect(Message.createOrder('VISVIRIAL', 1000000000, 'XCP', '123000000000', 1000).data)
		.toEqual(Buffer.from('0000040d5cba2a73000000003b9aca0000000000000000010000001ca35f0e0003e80000000000000000', 'hex'));
});

test('should create Send message correctly', () => {
	expect(Message.createSend('XCP', 100000000).data)
		.toEqual(Buffer.from('00000000000000010000000005f5e100', 'hex'));
});

