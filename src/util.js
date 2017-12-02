'use strict';

var Long = require('long');
var bitcoin = require('bitcoinjs-lib');
var bufferReverse = require('buffer-reverse');

var util = {};

util.B26DIGITS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
util.MNEMONIC_WORDS = require('./mnemonic_words.json');
util.MAX_OP_RETURN = 80;

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
};

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
};

/**
 * Recover a WIF from a given passphrase.
 * @param passphrase If array of length 2, [menmonic, password]. Otherwise, mnemonic.
 * @return String WIF format private key.
 */
util.mnemonicToPrivateKey = function(passphrase, index, network) {
	var getMnemonic = function(data) {
		if(data.length == 2) {
			throw new Error('Password is not implemented yet');
		} else {
			return data;
		}
	};
	var mnemonic = getMnemonic(passphrase);
	if(typeof mnemonic == 'string') {
		mnemonic = mnemonic.split(' ');
	}
	if(typeof mnemonic != 'object') {
		throw new Error('Gieven mnemonic is an invalid type: ' + (typeof mnemonic));
	}
	if(mnemonic.length%3 !== 0) {
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
};

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
	for(var i in asset_name) {
		var c = asset_name[i];
		var n = util.B26DIGITS.search(c);
		if(n < 0) throw new Error('Invalid character: ' + c);
		asset_id = asset_id.multiply(26).add(n);
	}
	if(asset_id.lessThan(26 * 26 * 26)) {
		throw new Error('Asset ID is too low');
	}
	return asset_id;
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
};

/**
 * Build a new Counterparty transaction.
 * @param Array inputs Each item should contain "String txid" and "Integer vout".
 * @param String/Object dest Destination output. Address for string. For object, format is {address: DEST_ADDR, value: SEND_AMOUNT}. If dest.value is omitted, the dust threashold (5430 satoshis) is assumed.
 * @param Message message A message to send.
 * @param Object change Excess bitcoins are paid to this address. Fromat: {address: CHANGE_ADDR, value: AMOUNT, fee_per_kb: FEE_PER_KB}. If fee_per_kb is specified, the fee amount will be determined from a transaction size and `value` will be ignored.
 * @return Buffer The unsinged raw transaction. You should sign it before broadcasting.
 */
util.buildTransaction = function(inputs, dest, message, change, network, oldStyle) {
	var tx = new bitcoin.Transaction();
	// Add inputs.
	for(var i in inputs) {
		var input = inputs[i];
		var hash = Buffer.from(input.txid.match(/.{2}/g).reverse().join(''), 'hex');
		tx.addInput(hash, input.vout);
	}
	// Add destination output.
	if(dest) {
		if(typeof dest == 'string') {
			dest = {
				address: dest,
				value: 5430,
			};
		}
		tx.addOutput(bitcoin.address.toOutputScript(dest.address, util.getBitcoinJSNetwork(network)), dest.value);
	}
	// Add message.
	var encrypted = message.toEncrypted(inputs[0].txid, oldStyle);
	for(var bytesWrote=0; bytesWrote<encrypted.length; bytesWrote+=util.MAX_OP_RETURN) {
		tx.addOutput(bitcoin.script.nullDataOutput(encrypted.slice(bytesWrote, bytesWrote+util.MAX_OP_RETURN)), 0);
	}
	// Add change.
	if(change.fee_per_kb) throw new Error('Calculating fee from change.fee_per_kb is not supported yet');
	tx.addOutput(bitcoin.address.toOutputScript(change.address, util.getBitcoinJSNetwork(network)), change.value);
	return tx.toBuffer();
};

util.parseTransaction = function(rawtx, network) {
	network = network || 'mainnet';
	var tx = null
	if(rawtx instanceof Buffer) {
		tx = bitcoin.Transaction.fromBuffer(rawtx);
	}
	if(typeof rawtx == 'string') {
		tx = bitcoin.Transaction.fromHex(rawtx);
	}
	if(!tx) {
		throw new Error('Invalid data type for rawtx');
	}
	// Get encryption key.
	var key = bufferReverse(tx.ins[0].hash);
	// Parse input to determine source pubkey.
	var source = (function(inputs) {
		var sources = [];
		for(var i in inputs) {
			var input = inputs[i];
			if(bitcoin.script.classifyInput(input.script) == 'pubkeyhash') {
				var pubkey = bitcoin.script.decompile(input.script)[1];
				sources.push(pubkey);
			}
		}
		// All input sources should be identical.
		for(var i=1; i<sources.length; i++) {
			if(!sources[0].equals(sources[i])) {
				return null;
			}
		}
		return sources[0];
	})(tx.ins);
	// Parse output.
	var destination = null;
	var rawdata = Buffer.alloc(0);
	for(var i in tx.outs) {
		var out = tx.outs[i];
		var type = bitcoin.script.classifyOutput(out.script);
		if(type == 'pubkeyhash') {
			if(!destination && rawdata.length===0) {
				destination = {
					address: bitcoin.address.toBase58Check(out.script.slice(3, 23), {mainnet: 0x00, testnet: 0x6f}[network]),
					amount: out.value,
				};
			}
		}
		if(type == 'nulldata') {
			rawdata = util.arc4(key, bitcoin.script.decompile(out.script)[1]);
		}
		if(type == 'multisig') {
			var decrypted = util.arc4(key, Buffer.concat([out.script.slice(3, 33), out.script.slice(36, 68)]));
			rawdata = Buffer.concat([rawdata, decrypted.slice(1, 1+decrypted[0])]);
		}
	}
	var message;
	try {
		message = require('./Message').fromSerialized(rawdata);
	} catch(e) {
		// maybe non-Counterparty tx.
	}
	return {
		key: key,
		sourcePublicKey: source,
		destination: destination,
		message: message,
	};
};

module.exports = util;

