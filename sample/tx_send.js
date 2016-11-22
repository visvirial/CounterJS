#!/usr/bin/env node
'use strict';

var xcp = require('../');
var common = require('./tx_common');

if(process.argv.length < 6) {
	console.log('usage: node tx_send.js FROM_WIF TO_ADDR ASSET AMOUNT');
	process.exit(1);
}

var idx = 2;
var fromWIF = process.argv[idx++];
var toAddr = process.argv[idx++];
var asset = process.argv[idx++];
var amount = Math.round(+process.argv[idx++] * 1e8);

var message = xcp.Message.createSend(asset, amount);
common.sendTransaction(fromWIF, toAddr, message);

