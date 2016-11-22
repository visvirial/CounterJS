#!/usr/bin/env node
'use strict';

var xcp = require('../');
var common = require('./tx_common');

if(process.argv.length < 4) {
	console.log('usage: node tx_broadcast.js FROM_WIF TEXT [VALUE [FEE_FRACTION [TIMESTAMP]]]');
	process.exit(1);
}

var idx = 2;
var fromWIF = process.argv[idx++];
var text = process.argv[idx++];
var value = process.argv[idx++];
var fee_fraction = process.argv[idx++];
var timestamp = process.argv[idx++];

var message = xcp.Message.createBroadcast(text, value, fee_fraction, timestamp);
common.sendTransaction(fromWIF, null, message);

