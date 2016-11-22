#!/usr/bin/env node
'use strict';

var bitcoin = require('bitcoinjs-lib');
var xcp = require('../');

if(process.argv.length < 3) {
	console.log('usage: node mnemonic2address.js "MNEMONIC" [INDEX=0] [NETWORK=mainnet]');
	process.exit(1);
}

var idx = 2;
var mnemonic = process.argv[idx++];
var index = process.argv[idx++] || 0;
var network = process.argv[idx++] || 'mainnet';

var wif = xcp.util.mnemonicToPrivateKey(mnemonic, index, network);
console.log('WIF: ' + wif);
console.log('address: ' + bitcoin.ECPair.fromWIF(wif, xcp.util.getBitcoinJSNetwork(network)).getAddress());

