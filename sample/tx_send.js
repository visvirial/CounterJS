#!/usr/bin/env node

var request = require('request');
var bitcoin = require('bitcoinjs-lib');
var xcp = require('../');

const BLOCKEXPLORER_ADDRESS = {
	mainnet: 'https://api.blockcypher.com/v1/btc/main/addrs/:ADDRESS:',
	testnet: 'https://api.blockcypher.com/v1/btc/test3/addrs/:ADDRESS:',
};
const BLOCKEXPLORER_BROADCAST = {
	mainnet: 'https://api.blockcypher.com/v1/btc/main/txs/push',
	testnet: 'https://api.blockcypher.com/v1/btc/test3/txs/push',
};
const FEE_TO_PAY = 20000;

if(process.argv.length < 6) {
	console.log('usage: node tx_send.js FROM_WIF TO_ADDR ASSET AMOUNT [NETWORK=mainnet]');
	process.exit(1);
}

var idx = 2;
var fromWIF = process.argv[idx++];
var toAddr = process.argv[idx++];
var asset = process.argv[idx++];
var amount = Math.round(+process.argv[idx++] * 1e8);
var network = process.argv[idx++] || 'mainnet';

// Compute address.
var fromPrivkey = bitcoin.ECPair.fromWIF(fromWIF, xcp.util.getBitcoinJSNetwork(network));
var fromAddr = fromPrivkey.getAddress();
// Fetch utxo data.
request.get(BLOCKEXPLORER_ADDRESS[network].replace(':ADDRESS:', fromAddr), function(err, res, body) {
	if(err) throw new Error('Failed to fetch utxo data: ' + err.toString());
	var json = JSON.parse(body);
	// Correct utxos.
	var utxos = [];
	for(var tx of json.txrefs.concat(json.unconfirmed_txrefs)) {
		if(tx.spent) continue;
		if(tx.tx_output_n < 0) continue;
		utxos.push({
			txid: tx.tx_hash,
			vout: tx.tx_output_n,
			value: tx.value,
			confirmations: tx.confirmations,
		});
	}
	// Sort according to coinage.
	utxos.sort(function(a, b) {
		return -(a.value*a.confirmations - b.value*b.confirmations);
	});
	// Elliminate unneccesory untxos.
	var inputs = [];
	var inAmount = 0;
	const MIN_REQUIRED = 5430;
	for(var utxo of utxos) {
		if(inAmount >= MIN_REQUIRED) break;
		inputs.push(utxo);
		inAmount += utxo.value;
	}
	if(inAmount < MIN_REQUIRED) throw new Error('Insufficient funds');
	var destinations = [{
		address: toAddr,
	}];
	var messages = [xcp.Message.createSend(asset, amount)];
	var change = {
		address: fromAddr,
		value: inAmount - MIN_REQUIRED - FEE_TO_PAY,
	};
	var rawtx = xcp.util.buildTransaction(inputs, destinations, messages, change, network);
	console.log('Unsigned tx: ' + rawtx.toString('hex'));
	// Sign transaction.
	var tx = bitcoin.Transaction.fromBuffer(rawtx);
	var builder = bitcoin.TransactionBuilder.fromTransaction(tx, xcp.util.getBitcoinJSNetwork(network));
	for(var vin=0; vin<inputs.length; vin++) {
		builder.inputs[vin].prevOutType = 'pubkeyhash';
		builder.sign(vin, fromPrivkey);
	}
	var signedtx = builder.build().toHex();
	console.log('Signed tx: ' + signedtx);
	// Broadcast.
	var options = {
		url: BLOCKEXPLORER_BROADCAST[network],
		method: 'POST',
		json: {tx: signedtx},
	};
	request.post(options, function(err, res, body) {
		if(err) throw new Error('Failed to broadcast tx: ' + err.toString());
		console.log('Broadcast successfully: txid = ' + body.tx.hash);
	});
});


