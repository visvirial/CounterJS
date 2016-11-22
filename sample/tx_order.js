#!/usr/bin/env node
'use strict';

const xcp = require('../');
const common = require('./tx_common');

if(process.argv.length < 7) {
	console.log('usage: node tx_order.js FROM_WIF GIVE_ASSET GIVE_QUANTITY GET_ASSET GET_QUANTITY [EXPIRATION=1000]');
	process.exit(1);
}

var idx = 2;
var fromWIF = process.argv[idx++];
var giveAsset = process.argv[idx++];
var giveQuantity = Math.round(+process.argv[idx++] * 1e8);
var getAsset = process.argv[idx++];
var getQuantity = Math.round(+process.argv[idx++] * 1e8);
var expiration = +(process.argv[idx++] || 1000);

var message = xcp.Message.createOrder(giveAsset, giveQuantity, getAsset, getQuantity, expiration);
common.sendTransaction(fromWIF, null, message);

