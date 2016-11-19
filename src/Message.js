
var xcputil = require('./util');

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
	return xcputil.arc4(key, this.toSerialized());
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
	return Message.fromSerialized(xcputil.arc4(key, data));
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

/* 
 * "Burn" message is just a normal bitcoin transfer transaction. We do not implement here.
 */
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

Message.createIssuance = function() {
	throw new Error('Not implemented');
};

Message.createOrder = function() {
	throw new Error('Not implemented');
};

Message.createPublish = function() {
	throw new Error('Not implemented');
};

Message.createRPS = function() {
	throw new Error('Not implemented');
};

Message.createRPSResolve = function() {
	throw new Error('Not implemented');
};

Message.createSend = function(asset_id, quantity) {
	var data = Buffer.alloc(16);
	// 0-7: Integer asset_id.
	data.writeUInt32BE(asset_id.high, 0);
	data.writeUInt32BE(asset_id.low, 4);
	// 8-15: Integer quantity.
	data.writeUInt32BE(quantity.high, 8);
	data.writeUInt32BE(quantity.low, 12);
	return new Message(xcputil.PREFIX, 0, data);
};

module.exports = Message;

