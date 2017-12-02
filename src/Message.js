'use strict';

const Long = require('long');
const util = require('./util');

/**
 * Create a new Message instance.
 * @param Integer id Message id.
 * @param Buffer data Serialized data.
 * @param String prefix Default = CNTRPRTY.
 */
var Message = function(id, data, prefix) {
	this.prefix = prefix || 'CNTRPRTY';
	this.id = id;
	this.data = data;
};

Message.prototype.toSerialized = function(oldStyle) {
	var bufid;
	if(oldStyle) {
		bufid = Buffer.alloc(4);
		bufid.writeUInt32BE(this.id);
	} else {
		bufid = Buffer.alloc(1);
		bufid.writeUInt8(this.id);
	}
	return Buffer.concat([
		Buffer.from(this.prefix),
		bufid,
		this.data
	]);
};

/**
 * Generate an encrypted binary data.
 * @param Buffer/String key A key used to sign. Buffer or hex-encoded string.
 */
Message.prototype.toEncrypted = function(key, oldStyle) {
	return util.arc4(key, this.toSerialized(oldStyle));
};

Message.TYPES = {
	30: {
		type: 'Broadcast',
		structure: [
			{
				label: 'timestamp',
				type: 'UInt32BE',
			},
			{
				label: 'value',
				type: 'DoubleBE',
			},
			{
				label: 'fee_fraction',
				type: 'UInt32BE',
			},
			{
				label: 'text',
				type: 'String',
				thresholdLen: 52,
			},
		],
	},
	70: {
		type: 'Cancel',
		structure: [
			{
				label: 'txid',
				type: 'Hex',
				length: 32,
			}
		],
	},
	50: {
		type: 'Dividend',
		structure: [
			{
				label: 'quantity_per_unit',
				type: 'UInt64BE',
			},
			{
				label: 'asset_id',
				type: 'AssetID',
			},
			{
				label: 'dividend_asset_id',
				type: 'AssetID',
			},
		],
	},
	20: {
		type: 'Issuance',
		structure: [
			{
				label: 'asset_id',
				type: 'AssetID',
			},
			{
				label: 'quantity',
				type: 'UInt64BE',
			},
			{
				label: 'divisible',
				type: 'Boolean',
			},
			{
				label: 'callable',
				type: 'Boolean',
			},
			{
				label: 'call_date',
				type: 'UInt32BE',
			},
			{
				label: 'call_price',
				type: 'FloatBE',
			},
			{
				label: 'description',
				type: 'String',
				thresholdLen: 42,
			},
		],
	},
	10: {
		type: 'Order',
		structure: [
			{
				label: 'give_id',
				type: 'AssetID',
			},
			{
				label: 'give_quantity',
				type: 'UInt64BE',
			},
			{
				label: 'get_id',
				type: 'AssetID',
			},
			{
				label: 'get_quantity',
				type: 'UInt64BE',
			},
			{
				label: 'expiration',
				type: 'UInt16BE',
			},
			{
				label: 'fee_required',
				type: 'UInt64BE',
			},
		],
	},
	0: {
		type: 'Send',
		structure: [
			{
				label: 'asset_id',
				type: 'AssetID',
			},
			{
				label: 'quantity',
				type: 'UInt64BE',
			},
		],
	},
	2: {
		type: 'Enhanced Send',
		structure: [
			{
				label: 'asset_id',
				type: 'AssetID',
			},
			{
				label: 'quantity',
				type: 'UInt64BE',
			},
		],
	}
};

Message.prototype.parse = function() {
	var struct = Message.TYPES[this.id];
	if(!struct) {
		throw new Error('Invalid message ID');
	}
	var data = {};
	var offset = 0;
	for(var i in struct.structure) {
		var item = struct.structure[i];
		switch(item.type) {
			case 'Boolean':
				data[item.label] = this.data[offset] ? true : false;
				offset += 1;
				break;
			case 'FloatBE':
				data[item.label] = this.data.readFloatBE(offset);
				offset += 4;
				break;
			case 'DoubleBE':
				data[item.label] = this.data.readDoubleBE(offset);
				offset += 8;
				break;
			case 'UInt16BE':
				data[item.label] = this.data.readUInt16BE(offset);
				offset += 2;
				break;
			case 'UInt32BE':
				data[item.label] = this.data.readUInt32BE(offset);
				offset += 4;
				break;
			case 'UInt64BE':
				data[item.label] = new Long(this.data.readUInt32BE(offset+4), this.data.readUInt32BE(offset), true);
				offset += 8;
				break;
			case 'String':
				data[item.label] = Message.bufferToString(this.data, offset, item.thresholdLen);
				offset = this.data.length;
				break;
			case 'Hex':
				data[item.label] = this.data.toString('hex', offset, offset+item.length);
				offset += item.length;
				break;
			case 'AssetID':
				data[item.label] = util.assetIdToName(new Long(this.data.readUInt32BE(offset+4), this.data.readUInt32BE(offset), true));
				offset += 8;
				break;
			default:
				throw new Error('Internal error: invalid item type: '+item.type)
		}
	}
	return {
		type: struct.type,
		data: data,
	};
};

Message.prototype.toJSON = function() {
	var parse = this.parse();
	parse.data.hex = this.data.toString('hex');
	return {
		prefix: this.prefix,
		id: this.id,
		type: parse.type,
		data: parse.data,
	};
};

Message.prototype.toString = function() {
	return JSON.stringify(this.toJSON(), null, '\t');
};

/**
 * Returns a new Message instance from a given serialized and decoded buffer object.
 */
Message.fromSerialized = function(ser) {
	if(typeof ser == 'string') ser = Buffer.from(ser, 'hex');
	var prefix = null;
	if(ser.length >= 8 && ser.slice(0, 8).toString() == 'CNTRPRTY') {
		prefix = 'CNTRPRTY';
	}
	if(ser.length >= 2 && ser.slice(0, 2).toString() == 'XX') {
		prefix = 'XX';
	}
	if(!prefix) throw new Error('Invalid prefix.');
	if(ser.length < prefix.length + 4) throw new Error('Insufficient data length');
	var id = ser.readUInt8(prefix.length);
	// zero represents legacy cp transactions to read the 4bytes instead of 1
	var data = ser.slice(prefix.length + (id==0 ? 4 : 1));
	if(id == 0) {
		id = ser.readUInt32BE(prefix.length);
	}
	return new Message(id, data, prefix);
};

/**
 * @param Buffer/String key The key to decode given data (the txid of first input of a transaction).
 * @param Buffer/String data The data chunk embedded in a transaction.
 */
Message.fromEncrypted = function(key, data) {
	return Message.fromSerialized(util.arc4(key, data));
};



Message.stringToBuffer = function(str, thresholdLen) {
	var buf = Buffer.from(str);
	// "Pascal-style" serialization (the first byte is the length of a string)
	if(str.length <= thresholdLen) {
		buf = Buffer.concat([Buffer.from([str.length]), buf]);
	}
	return buf;
};

Message.bufferToString = function(buf, offset, thresholdLen) {
	if(buf.length-offset <= thresholdLen) {
		var len = buf[offset];
		return buf.toString('utf8', offset+1, offset+len+1);
	}
	return buf.toString('utf8', offset);
}

Message.createBet = function(bet_type, deadline, wager_quantity, counterwager_quantity, target_value, leverage, expiration) {
	throw new Error('Not implemented');
};

Message.createBroadcast = function(text, value, fee_fraction, timestamp) {
	value = value || -1;
	fee_fraction = fee_fraction || 0;
	timestamp = timestamp || Math.floor(new Date().getTime()/1000);
	// Create input buffers.
	var buf_timestamp = Buffer.alloc(4);
	buf_timestamp.writeUInt32BE(timestamp);
	var buf_value = Buffer.alloc(8);
	buf_value.writeDoubleBE(value);
	var buf_fee_fraction = Buffer.alloc(4);
	buf_fee_fraction.writeUInt32BE(fee_fraction);
	var buf_text = Message.stringToBuffer(text, 52);
	return new Message(30, Buffer.concat([
		buf_timestamp,
		buf_value,
		buf_fee_fraction,
		buf_text,
	]));
};

Message.createBTCPay = function() {
	throw new Error('Not implemented');
};

/* "Burn" message is just a normal bitcoin transfer transaction. We do not implement here. */
//Message.createBurn = function() {};

Message.createCancel = function(txid) {
	var buf = null;
	if(typeof txid == 'string') buf=Buffer.from(txid, 'hex');
	if(txid instanceof Buffer) buf=Buffer.from(txid);
	if(!buf) throw new Error('Invalid data type');
	return new Message(70, buf);
};

Message.createDestroy = function() {
	throw new Error('Not implemented');
};

Message.createDividend = function(quantity_per_unit, asset, dividend_asset) {
	quantity_per_unit = Long.fromValue(quantity_per_unit);
	var asset_id = util.toAssetId(asset);
	var dividend_asset_id = util.toAssetId(dividend_asset);
	// Create input buffers.
	var buf_quantity_per_unit = Buffer.from(quantity_per_unit.toBytesBE());
	var buf_asset_id = Buffer.from(asset_id.toBytesBE());
	var buf_dividend_asset_id = Buffer.from(dividend_asset_id.toBytesBE());
	return new Message(50, Buffer.concat([
		buf_quantity_per_unit,
		buf_asset_id,
		buf_dividend_asset_id,
	]));
};

Message.createExecute = function() {
	throw new Error('Not implemented');
};

Message.createIssuance = function(asset, quantity, divisible, description, callable, call_date, call_price) {
	callable = callable || false;
	call_date = call_date || 0;
	call_price = call_price || 0.0;
	// Accept flexible params.
	var asset_id = util.toAssetId(asset);
	quantity = Long.fromValue(quantity);
	// Create input buffers.
	var buf_asset_id = Buffer.from(asset_id.toBytesBE());
	var buf_quantity = Buffer.from(quantity.toBytesBE());
	var buf_divisible = Buffer.from([divisible ? 1 : 0]);
	var buf_callable = Buffer.from([callable ? 1 : 0]);
	var buf_call_date = Buffer.alloc(4);
	buf_call_date.writeUInt32BE(call_date || 0);
	var buf_call_price = Buffer.alloc(4);
	buf_call_price.writeFloatBE(call_price);
	var buf_description = Message.stringToBuffer(description, 42);
	return new Message(20, Buffer.concat([
		buf_asset_id,
		buf_quantity,
		buf_divisible,
		buf_callable,
		buf_call_date,
		buf_call_price,
		buf_description,
	]));
};

Message.createOrder = function(give_id, give_quantity, get_id, get_quantity, expiration, fee_required) {
	fee_required = fee_required || 0;
	// Accept flexible params.
	give_id = util.toAssetId(give_id);
	give_quantity = Long.fromValue(give_quantity);
	get_id = util.toAssetId(get_id);
	get_quantity = Long.fromValue(get_quantity);
	fee_required = Long.fromValue(fee_required);
	// Create input buffers.
	var buf_give_id = Buffer.from(give_id.toBytesBE());
	var buf_give_quantity = Buffer.from(give_quantity.toBytesBE());
	var buf_get_id = Buffer.from(get_id.toBytesBE());
	var buf_get_quantity = Buffer.from(get_quantity.toBytesBE());
	var buf_expiration = Buffer.alloc(2);
	buf_expiration.writeUInt16BE(expiration);
	var buf_fee_required = Buffer.from(fee_required.toBytesBE());
	return new Message(10, Buffer.concat([
		buf_give_id,
		buf_give_quantity,
		buf_get_id,
		buf_get_quantity,
		buf_expiration,
		buf_fee_required,
	]));
};

Message.createPublish = function() {
	throw new Error('Not implemented');
};

/* Rock-Paper-Scissors type message is removed. We will not implement here. */
//Message.createRPS = function() {};
//Message.createRPSResolve = function() {};

Message.createSend = function(asset, quantity) {
	// Accept flexible params.
	var asset_id = util.toAssetId(asset);
	quantity = Long.fromValue(quantity);
	// Create input buffers.
	var buf_asset_id = Buffer.from(asset_id.toBytesBE());
	var buf_quantity = Buffer.from(quantity.toBytesBE());
	return new Message(0, Buffer.concat([
		buf_asset_id,
		buf_quantity,
	]));
};

module.exports = Message;

