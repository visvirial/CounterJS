
var crypto = require('crypto');
var Long = require('long');
var bitcoin = require('bitcoinjs-lib');

var util = {};

util.PREFIX = 'CNTRPRTY';
util.B26DIGITS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
util.MNEMONIC_WORDS = require('./mnemonic_words.json');

util.getBitcoinJSNetwork = function(str) {
	str = str || 'mainnet';
	switch(str) {
		case 'mainnet':
			return bitcoin.networks.bitcoin;
		case 'testnet':
			return bitcoin.networks.testnet;
		default:
			throw new Error('Invalid network name specified');
	}
}

/**
 * Encrypt/Decrypt given data using (A)RC4.
 */
util.arc4 = function(key, data) {
	if(typeof key == 'string') key = Buffer.from(key, 'hex');
	if(typeof data == 'string') data = Buffer.from(data, 'hex');
	var S = [];
	for(var i=0; i<256; i++) {
		S[i] = i;
	}
	for(var i=0,j=0; i<256; i++) {
		j = (j + S[i] + key[i % key.length]) % 256;
		[S[i], S[j]] = [S[j], S[i]];
	}
	var ret = [];
	for(var x=0,i=0,j=0; x<data.length; x++) {
		i = (i + 1) % 256;
		j = (j + S[i]) % 256;
		[S[i], S[j]] = [S[j], S[i]];
		var K = S[(S[i] + S[j]) % 256];
		ret.push(data[x] ^ K);
	}
	return Buffer.from(ret);
}

/**
 * Recover a WIF from a given passphrase.
 * @param passphrase If array of length 2, [menmonic, password]. Otherwise, mnemonic.
 * @return String WIF format private key.
 */
util.mnemonicToPrivateKey = function(passphrase, index, network) {
	if(passphrase.length == 2) {
		throw new Error('Password is not implemented yet');
	} else {
		var mnemonic = passphrase;
	}
	if(typeof mnemonic == 'string') {
		mnemonic = mnemonic.split(' ');
	}
	if(typeof mnemonic != 'object') {
		throw new Error('Gieven mnemonic is an invalid type: ' + (typeof mnemonic));
	}
	if(mnemonic.length%3 != 0) {
		throw new Error('The length of mnemonic array should be divisible by 3');
	}
	var seed = Buffer.alloc(4*mnemonic.length/3);
	const N = util.MNEMONIC_WORDS.length;
	var mod = function(a, b) {
		return a - Math.floor(a/b)*b;
	};
	for(var i=0; i<mnemonic.length/3; i++) {
		var w1 = util.MNEMONIC_WORDS.indexOf(mnemonic[3*i+0]);
		var w2 = util.MNEMONIC_WORDS.indexOf(mnemonic[3*i+1]);
		var w3 = util.MNEMONIC_WORDS.indexOf(mnemonic[3*i+2]);
		if(w1<0) throw new Error('Invalid word specified: ' + mnemonic[3*i+0]);
		if(w2<0) throw new Error('Invalid word specified: ' + mnemonic[3*i+1]);
		if(w3<0) throw new Error('Invalid word specified: ' + mnemonic[3*i+2]);
		seed.writeUInt32BE(w1 + N*mod(w2-w1, N) + N*N*mod(w3-w2, N), 4*i);
	}
	var master = bitcoin.HDNode.fromSeedBuffer(seed, util.getBitcoinJSNetwork(network));
	return master.derivePath('m/0\'/0/'+index).keyPair.toWIF();
}

util.assetIdToName = function(asset_id) {
	if(asset_id.equals(0)) return 'BTC';
	if(asset_id.equals(1)) return 'XCP';
	if(asset_id.lessThan(26 * 26 * 26)) {
		throw new Error('Asset ID is too low');
	}
	// We assume numeric asset is enabled.
	if(asset_id.greaterThan(Long.fromString(/*26^12*/'95428956661682176'))) {
		return 'A' + asset_id.toString();
	}
	var asset_name = '';
	var rem = Long.fromValue(asset_id);
	for(;rem.greaterThan(0); rem=rem.divide(26)) {
		var r = rem.mod(26);
		asset_name = util.B26DIGITS[r] + asset_name;
	}
	return asset_name;
};

util.assetNameToId = function(asset_name) {
	if(asset_name == 'BTC') return Long.fromInt(0);
	if(asset_name == 'XCP') return Long.fromInt(1);
	if(asset_name.length < 4) {
		throw new Error('Asset name is too short');
	}
	// We assume numeric asset is enabled.
	if(asset_name[0] == 'A') {
		// Check the format
		if(!asset_name.match(/^A[0-9]+$/)) {
			throw new Error('Non-numeric asset name should not start with "A"');
		}
		var asset_id = Long.fromString(asset_name.substr(1), true);
		if(!asset_id.greaterThan(Long.fromString(/*26^12*/'95428956661682176', true))) {
			throw new Error('Asset ID is too small');
		}
		return asset_id;
	}
	if(asset_name.length >= 13) {
		throw new Error('Asset name is too long');
	}
	var asset_id = Long.fromInt(0);
	for(var c of asset_name) {
		var n = util.B26DIGITS.search(c);
		if(n < 0) throw new Error('Invalid character: ' + c);
		asset_id = asset_id.multiply(26).add(n);
	}
	if(asset_id.lessThan(26 * 26 * 26)) {
		throw new Error('Asset ID is too low');
	}
	return asset_id
};

/**
 * Convert given data to asset ID.
 */
util.toAssetId = function(asset) {
	if(asset instanceof Long) return Long.fromValue(asset);
	if(typeof asset == 'number') {
		return Long.fromInteger(asset, true);
	}
	if(typeof asset == 'string') {
		// If start from A.
		if(asset[0] == 'A') {
			return Long.fromString(asset.substr(1), true);
		}
		return util.assetNameToId(asset);
	}
	throw new Error('Invalid asset type');
}

/**
 * Build a new Counterparty transaction.
 * @param Array inputs Each item should contain "String txid" and "Integer vout".
 * @param Array destinations Destination outputs. Item should contain "String address" and optionally "Integer value (default=5430)".
 * @param Message[] message The message object.
 * @param String change_addr Excess bitcoins are paid to this address.
 * @return Buffer The unsinged raw transaction. You should sign it before broadcasting.
 */
util.buildTransaction = function(inputs, destinations, messages, change, network) {
	var tx = new bitcoin.Transaction();
	// Add inputs.
	for(var input of inputs) {
		var hash = Buffer.from(input.txid.match(/.{2}/g).reverse().join(''), 'hex');
		tx.addInput(hash, input.vout);
	}
	// Add destination outputs.
	for(var dest of destinations) {
		if(typeof dest.value == 'undefined') {
			dest.value = 5430;
		}
		tx.addOutput(bitcoin.address.toOutputScript(dest.address, util.getBitcoinJSNetwork(network)), dest.value);
	}
	// Add messages.
	for(var msg of messages) {
		var data = msg.toEncrypted(Buffer.from(inputs[0].txid, 'hex'));
		tx.addOutput(bitcoin.script.nullDataOutput(data), 0);
	}
	// Add change.
	tx.addOutput(bitcoin.address.toOutputScript(change.address, util.getBitcoinJSNetwork(network)), change.value);
	return tx.toBuffer();
}

module.exports = util;

