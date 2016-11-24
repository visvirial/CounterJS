#!/usr/bin/env node
'use strict';

var request = require('request');
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
	// Parse input.
	var key = Buffer.from(json.inputs[0].prev_hash, 'hex');
	var getSource = function(inputs) {
		var sources = [];
		for(var i in inputs) {
			var input = inputs[i];
			if(input.script_type == 'pay-to-pubkey-hash') {
				sources.push(input.addresses[0]);
			}
		}
		for(let i=1; i<sources.length; i++) {
			if(sources[i] != sources[0]) return null;
		}
		return sources[0];
	};
	var source = getSource(json.inputs);
	// Parse output.
	var destination = null;
	var rawdata = Buffer.alloc(0);
	var type = null;
	for(var i in json.outputs) {
		var out = json.outputs[i];
		if(out.script_type == 'pay-to-pubkey-hash') {
			if(!destination && rawdata.length===0) {
				destination = {
					address: out.addresses[i],
					amount: out.value,
				};
			}
		}
		if(out.script_type == 'null-data') {
			type = 'OP_RETURN';
			rawdata = xcp.util.arc4(key, out.data_hex);
		}
		if(out.script_type == 'pay-to-multi-pubkey-hash') {
			type = 'multisig';
			var buf = Buffer.from(out.script, 'hex');
			var decrypted = xcp.util.arc4(key, Buffer.concat([buf.slice(3, 33), buf.slice(36, 68)]));
			rawdata = Buffer.concat([rawdata, decrypted.slice(1, 1+decrypted[0])]);
		}
	}
	// Print result.
	console.log('Source address: '+(source?source:'N/A'));
	if(destination) {
		console.log('Destination address/amount: '+destination.address+' / '+(1e-5*destination.amount).toFixed(5)+' mBTC');
	} else {
		console.log('Destination address/amount: N/A');
	}
	console.log('Embedded data:');
	try {
		console.log(xcp.Message.fromSerialized(rawdata).toJSON());
	} catch(e) {
		console.log('Non-counterparty or invalid data: ' + e.toString());
	}
});

