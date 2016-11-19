
var Long = require('long');

var util = {};

util.PREFIX = 'CNTRPRTY';
util.B26DIGITS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Encrypt/Decrypt given data using (A)RC4.
 */
util.arc4 = function(key, data) {
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

module.exports = util;

