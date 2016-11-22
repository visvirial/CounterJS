#!/usr/bin/env node
'use strict';

var xcp = require('../');
var common = require('./tx_common');

if(process.argv.length < 6) {
	console.log('usage: node tx_dividend.js FROM_WIF QUANTITY_PER_UNIT ASSET DIVIDEND_ASSET');
	process.exit(1);
}

var idx = 2;
var fromWIF = process.argv[idx++];
var quantity_per_unit = Math.floor(1e8 * process.argv[idx++]);
var asset = process.argv[idx++];
var dividend_asset = process.argv[idx++];

var message = xcp.Message.createDividend(quantity_per_unit, asset, dividend_asset);
common.sendTransaction(fromWIF, null, message);

