#!/usr/bin/env node
'use strict';

const xcp = require('../');
const common = require('./tx_common');

if(process.argv.length < 7) {
	console.log('usage: node tx_send.js FROM_WIF ASSET QUANTITY DIVISIBLE DESCRIPTION');
	process.exit(1);
}

var idx = 2;
var fromWIF = process.argv[idx++];
var asset = process.argv[idx++];
var quantity = Math.round(+process.argv[idx++] * 1e8);
var divisible = {true: true, false: false}[process.argv[idx++]];
if(typeof divisible == 'undefined') throw new Error('Invalid DIVISIBLE');
var desc = process.argv[idx++];

var message = xcp.Message.createIssuance(asset, quantity, divisible, desc);
common.sendTransaction(fromWIF, null, message);

