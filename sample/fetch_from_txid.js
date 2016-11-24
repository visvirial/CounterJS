#!/usr/bin/env node
'use strict';

var request = require('request');
var bitcoin = require('bitcoinjs-lib');
var xcp = require('../');

const EXPLORER_TX = {
	mainnet: 'https://api.blockcypher.com/v1/btc/main/txs/:TXID:?includeHex=true',
	testnet: 'https://api.blockcypher.com/v1/btc/test3/txs/:TXID:?includeHex=true',
};

if(process.argv.length < 3) {
	console.log('usage: node fetch_from_txid TXID [NETWORK=mainnet]');
	console.log('Fetch a transaction data of a given TXID from BlockCypher and parse it.');
	process.exit(1);
}

var txid = process.argv[2];
var network = process.argv[3] || 'mainnet';
if(!EXPLORER_TX[network]) throw new Error('Invalid network (should be mainnet/testnet)');

request(EXPLORER_TX[network].replace(':TXID:', txid), function(err, req, body) {
	if(err) throw new Error('Failed to access to the blockexplorer: ' + err.toString());
	var json = JSON.parse(body);
	if(json.error) throw new Error('Failed to fetch transaction data: ' + json.error);
	var parsed = xcp.util.parseTransaction(json.hex, network);
	console.log('Source address: '+(parsed.sourcePublicKey?bitcoin.ECPair.fromPublicKeyBuffer(parsed.sourcePublicKey, xcp.util.getBitcoinJSNetwork(network)).getAddress():'N/A'));
	if(parsed.destination) {
		console.log('Destination address/amount: '+parsed.destination.address+' / '+(1e-5*parsed.destination.amount).toFixed(5)+' mBTC');
	} else {
		console.log('Destination address/amount: N/A');
	}
	console.log('Embedded data:');
	if(parsed.message) {
		console.log(parsed.message.toJSON());
	} else {
		console.log('Non-counterparty or invalid data');
	}
});

