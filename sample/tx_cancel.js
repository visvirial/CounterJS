#!/usr/bin/env node
'use strict';

var xcp = require('../');
var common = require('./tx_common');

if(process.argv.length < 4) {
	console.log('usage: node tx_cancel.js FROM_WIF TXID');
	process.exit(1);
}

var idx = 2;
var fromWIF = process.argv[idx++];
var txid = process.argv[idx++];

var message = xcp.Message.createCancel(txid);
common.sendTransaction(fromWIF, null, message);

