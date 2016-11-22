'use strict';

var request = require('request');
var bitcoin = require('bitcoinjs-lib');
var xcp = require('../');

var common = {};

common.BLOCKEXPLORER_ADDRESS = {
	mainnet: 'https://api.blockcypher.com/v1/btc/main/addrs/:ADDRESS:?unspentOnly=true',
	testnet: 'https://api.blockcypher.com/v1/btc/test3/addrs/:ADDRESS:?unspentOnly=true',
};
common.BLOCKEXPLORER_BROADCAST = {
	mainnet: 'https://api.blockcypher.com/v1/btc/main/txs/push',
	testnet: 'https://api.blockcypher.com/v1/btc/test3/txs/push',
};
common.FEE_TO_PAY = 20000;

common.getNetworkFromAddress = function(addr) {
	switch(bitcoin.address.fromBase58Check(addr).version) {
		case bitcoin.networks.bitcoin.pubKeyHash:
		case bitcoin.networks.bitcoin.scriptHash:
			return 'mainnet';
		case bitcoin.networks.testnet.pubKeyHash:
		case bitcoin.networks.testnet.scriptHash:
			return 'testnet';
	}
	return null;
};

common.fetchUnspentOutputs = function(addr, cb) {
	var network = common.getNetworkFromAddress(addr);
	if(!network) {
		cb(new Error('Invalid address version'));
		return;
	}
	request.get(common.BLOCKEXPLORER_ADDRESS[network].replace(':ADDRESS:', addr), function(err, res, body) {
		if(err) {
			cb(err);
		}
		var json = JSON.parse(body);
		// Collect utxos.
		var utxos = [];
		var txrefs = json.txrefs;
		if(json.unconfirmed_txrefs) txrefs.concat(json.unconfirmed_txrefs);
		for(var tx of txrefs) {
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
		cb(null, utxos);
	});
};

common.signTransaction = function(rawtx, privkey) {
	var tx = bitcoin.Transaction.fromBuffer(rawtx);
	var builder = bitcoin.TransactionBuilder.fromTransaction(tx, privkey.network);
	for(var vin=0; vin<builder.inputs.length; vin++) {
		builder.inputs[vin].prevOutType = 'pubkeyhash';
		builder.sign(vin, privkey);
	}
	return builder.build().toHex();
};

common.broadcast = function(tx, network, cb) {
	var options = {
		url: common.BLOCKEXPLORER_BROADCAST[network],
		method: 'POST',
		json: {tx: tx},
	};
	request.post(options, function(err, res, body) {
		cb(err, body);
	});
};

common.sendTransaction = function(fromWIF, toAddr, message) {
	// Compute address.
	var fromPrivkey = bitcoin.ECPair.fromWIF(fromWIF, [bitcoin.networks.bitcoin, bitcoin.networks.testnet]);
	var network = fromPrivkey.network.wif==0x80 ? 'mainnet' : 'testnet';
	var fromAddr = fromPrivkey.getAddress();
	// Fetch utxo data.
	common.fetchUnspentOutputs(fromAddr, function(err, utxos) {
		if(err) throw new Error('Failed to fetch utxo data: ' + err.toString());
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
		var change = {
			address: fromAddr,
			value: inAmount - MIN_REQUIRED - common.FEE_TO_PAY,
		};
		var rawtx = xcp.util.buildTransaction(inputs, toAddr, message, change, network);
		console.log('Unsigned tx: ' + rawtx.toString('hex'));
		// Sign transaction.
		var signedtx = common.signTransaction(rawtx, fromPrivkey);
		console.log('Signed tx: ' + signedtx);
		// Broadcast.
		common.broadcast(signedtx, network, function(err, json) {
			if(err) throw new Error('Failed to broadcast tx: ' + err.toString());
			console.log('Broadcast successfully: txid = ' + json.tx.hash);
		});
	});
};

module.exports = common;

