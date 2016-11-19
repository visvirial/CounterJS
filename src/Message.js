
var Long = require('long');
var util = require('./util');

/**
 * Create a new Message instance.
 * @param String prefix CNTRPRTY for mainnet, XX for testnet.
 * @param Integer id Message id.
 * @param Buffer data Serialized data.
 */
var Message = function(prefix, id, data) {
	this.prefix = prefix;
	this.id = id;
	this.data = data;
};

Message.prototype.toSerialized = function() {
	var bufid = Buffer.alloc(4);
	bufid.writeUInt32BE(this.id);
	return Buffer.concat([
		Buffer.from(this.prefix),
		bufid,
		this.data
	]);
}

Message.prototype.toEncrypted = function(key) {
	return util.arc4(key, this.toSerialized());
}

Message.prototype.parse = function() {
	var type;
	var data = {};
	switch(this.id) {
		case 0:
			type = 'Send';
			if(this.data.length != 16) {
				data.error = 'Invalid data length';
				break;
			}
			data.asset_id = new Long(this.data.readUInt32BE(4), this.data.readUInt32BE(0), true);
			data.quantity = new Long(this.data.readUInt32BE(12), this.data.readUInt32BE(8), true);
			break;
		default:
			type = 'Unknown';
			data.error = 'Unknown ID: ' + this.id;
	}
	return {
		type: type,
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
}

Message.prototype.toString = function() {
	return JSON.stringify(this.toJSON(), null, '\t');
}

/**
 * Returns a new Message instance from a given serialized and decoded buffer object.
 */
Message.fromSerialized = function(ser) {
	var prefix = null;
	if(ser.length >= 8 && ser.slice(0, 8).toString() == 'CNTRPRTY') {
		prefix = 'CNTRPRTY';
	}
	if(ser.length >= 2 && ser.slice(0, 2).toString() == 'XX') {
		prefix = 'XX';
	}
	if(!prefix) throw new Error('Invalid prefix.');
	if(ser.length < prefix.length + 4) throw new Error('Insufficient data length');
	var id = ser.readUInt32BE(prefix.length);
	var data = ser.slice(prefix.length+4);
	return new Message(prefix, id, data);
}

/**
 * @param Buffer key The key to decode given data (the txid of first input of a transaction).
 * @param Buffer data The data chunk embedded in a transaction.
 */
Message.fromEncrypted = function(key, data) {
	return Message.fromSerialized(util.arc4(key, data));
}



Message.createBet = function(bet_type, deadline, wager_quantity, counterwager_quantity, target_value, leverage, expiration) {
	throw new Error('Not implemented');
};

Message.createBroadcast = function() {
	throw new Error('Not implemented');
};

Message.createBTCPay = function() {
	throw new Error('Not implemented');
};

/* "Burn" message is just a normal bitcoin transfer transaction. We do not implement here. */
//Message.createBurn = function() {};

Message.createCancel = function() {
	throw new Error('Not implemented');
};

Message.createDestroy = function() {
	throw new Error('Not implemented');
};

Message.createDividend = function() {
	throw new Error('Not implemented');
};

Message.createExecute = function() {
	throw new Error('Not implemented');
};

Message.createIssuance = function(asset_id, quantity, divisible, callable, call_date, call_price, description) {
	var buf_asset_id = Buffer.from(asset_id.toBytesBE());
	var buf_quantity = Buffer.from(quantity.toBytesBE());
	var buf_divisible = Buffer.from([divisible ? 1 : 0]);
	var buf_callable = Buffer.from([callable ? 1 : 0]);
	var buf_call_date = Buffer.alloc(4);
	buf_call_date.writeUInt32BE(call_date || 0);
	var buf_call_price = Buffer.alloc(4);
	buf_call_price.writeFloatBE(call_price);
	var buf_description = Buffer.from(description);
	// "Pascal-style" serialization (the first byte is the length of a string)
	if(description.length <= 42) {
		buf_description = Buffer.concat([Buffer.from([description.length]), buf_description]);
	}
	return new Message(util.PREFIX, 0, Buffer.concat([
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
	var buf_give_id = Buffer.from(give_id.toBytesBE());
	var buf_give_quantity = Buffer.from(give_quantity.toBytesBE());
	var buf_get_id = Buffer.from(get_id.toBytesBE());
	var buf_get_quantity = Buffer.from(get_quantity.toBytesBE());
	var buf_expiration = Buffer.alloc(2);
	buf_expiration.writeUInt16BE(expiration);
	var buf_fee_required = Buffer.from(fee_required.toBytesBE());
	return new Message(util.PREFIX, 0, Buffer.concat([
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

Message.createSend = function(asset_id, quantity) {
	var buf_asset_id = Buffer.from(asset_id.toBytesBE());
	var buf_quantity = Buffer.from(quantity.toBytesBE());
	return new Message(util.PREFIX, 0, Buffer.concat([
		buf_asset_id,
		buf_quantity,
	]));
};

module.exports = Message;

