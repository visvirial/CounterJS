
import Long from 'long';
import * as bitcoin from 'bitcoinjs-lib';

import * as util from './util';
import TYPES from './TYPES';

export default class Message {
	
	id: number;
	data: Buffer;
	prefix: string;
	
	/**
	 * Create a new Message instance.
	 * @param Integer id Message id.
	 * @param Buffer data Serialized data.
	 * @param String prefix Default = CNTRPRTY.
	 */
	constructor(id: number, data: Buffer, prefix: string='CNTRPRTY') {
		this.id = id;
		this.data = data;
		this.prefix = prefix;
	};
	
	toSerialized(oldStyle: boolean=false): Buffer {
		let bufid;
		if(oldStyle) {
			bufid = Buffer.alloc(4);
			bufid.writeUInt32BE(this.id, 0);
		} else {
			bufid = Buffer.alloc(1);
			bufid.writeUInt8(this.id, 0);
		}
		return Buffer.concat([
			Buffer.from(this.prefix),
			bufid,
			this.data
		]);
	}
	
	/**
	 * Generate an encrypted binary data.
	 * @param Buffer key A key used to sign.
	 */
	toEncrypted(key: Buffer, oldStyle: boolean=false): Buffer {
		return util.arc4(key, this.toSerialized(oldStyle));
	}
	
	parse(networkName?: 'Bitcoin'|'Monacoin') {
		const STRUCT = TYPES[this.id];
		if(STRUCT === undefined) {
			throw new Error('Invalid message ID');
		}
		const data = {};
		let offset = 0;
		for(let i in STRUCT.structure) {
			let item = STRUCT.structure[i];
			switch(item.type) {
				case 'Boolean':
					(<any>data)[item.label] = this.data[offset] ? true : false;
					offset += 1;
					break;
				case 'FloatBE':
					(<any>data)[item.label] = this.data.readFloatBE(offset);
					offset += 4;
					break;
				case 'DoubleBE':
					(<any>data)[item.label] = this.data.readDoubleBE(offset);
					offset += 8;
					break;
				case 'UInt16BE':
					(<any>data)[item.label] = this.data.readUInt16BE(offset);
					offset += 2;
					break;
				case 'UInt32BE':
					(<any>data)[item.label] = this.data.readUInt32BE(offset);
					offset += 4;
					break;
				case 'UInt64BE':
					(<any>data)[item.label] = new Long(this.data.readUInt32BE(offset+4), this.data.readUInt32BE(offset), true);
					offset += 8;
					break;
				case 'String':
					(<any>data)[item.label] = Message.bufferToString(this.data, offset, <number>item.thresholdLen);
					offset = this.data.length;
					break;
				case 'Hex':
					if(item.length === undefined) throw new Error('Internal error: item.length is undefined.');
					(<any>data)[item.label] = this.data.toString('hex', offset, offset+item.length);
					offset += item.length;
					break;
				case 'AssetID':
					(<any>data)[item.label] = util.assetIdToName(new Long(this.data.readUInt32BE(offset+4), this.data.readUInt32BE(offset), true), networkName);
					offset += 8;
					break;
				default:
					throw new Error('Internal error: invalid item type: '+item.type)
			}
		}
		return {
			type: STRUCT.type,
			data: data,
		};
	};
	
	toJSON() {
		let parse = this.parse();
		(parse.data as any).hex = this.data.toString('hex');
		return {
			prefix: this.prefix,
			id: this.id,
			type: parse.type,
			data: parse.data,
		};
	};
	
	toString() {
		return JSON.stringify(this.toJSON(), null, '\t');
	};
	
	/**
	 * Returns a new Message instance from a given serialized and decoded buffer object.
	 */
	static fromSerialized(ser: Buffer) {
		let prefix: string|null = null;
		if(ser.length >= 8 && ser.slice(0, 8).toString() == 'CNTRPRTY') {
			prefix = 'CNTRPRTY';
		}
		if(ser.length >= 2 && ser.slice(0, 2).toString() == 'XX') {
			prefix = 'XX';
		}
		if(prefix === null) throw new Error('Invalid prefix.');
		if(ser.length < prefix.length + 4) throw new Error('Insufficient data length');
		let id = ser.readUInt8(prefix.length);
		// zero represents legacy cp transactions to read the 4bytes instead of 1
		let data = ser.slice(prefix.length + (id==0 ? 4 : 1));
		if(id == 0) {
			id = ser.readUInt32BE(prefix.length);
		}
		return new Message(id, data, prefix);
	};
	
	/**
	 * @param Buffer key The key to decode given data (the txid of first input of a transaction).
	 * @param Buffer data The data chunk embedded in a transaction.
	 */
	static fromEncrypted(key: Buffer, data: Buffer) {
		return Message.fromSerialized(util.arc4(key, data));
	};
	
	static stringToBuffer(str: string, thresholdLen: number) {
		let buf = Buffer.from(str);
		// "Pascal-style" serialization (the first byte is the length of a string)
		if(str.length <= thresholdLen) {
			buf = Buffer.concat([Buffer.from([str.length]), buf]);
		}
		return buf;
	};
	
	static bufferToString(buf: Buffer, offset: number, thresholdLen: number) {
		if(buf.length-offset <= thresholdLen) {
			let len = buf[offset];
			return buf.toString('utf8', offset+1, offset+len+1);
		}
		return buf.toString('utf8', offset);
	}
	
	/*
	static createBet(bet_type, deadline, wager_quantity, counterwager_quantity, target_value, leverage, expiration) {
		throw new Error('Not implemented');
	};
	*/
	
	static createBroadcast(text: string, value: number=-1, fee_fraction: number=0, timestamp: number=Math.floor(new Date().getTime()/1000)) {
		// Create input buffers.
		let buf_timestamp = Buffer.alloc(4);
		buf_timestamp.writeUInt32BE(timestamp, 0);
		let buf_value = Buffer.alloc(8);
		buf_value.writeDoubleBE(value, 0);
		let buf_fee_fraction = Buffer.alloc(4);
		buf_fee_fraction.writeUInt32BE(fee_fraction, 0);
		let buf_text = Message.stringToBuffer(text, 52);
		return new Message(30, Buffer.concat([
			buf_timestamp,
			buf_value,
			buf_fee_fraction,
			buf_text,
		]));
	};
	
	static createBTCPay() {
		throw new Error('Not implemented');
	};
	
	/* "Burn" message is just a normal bitcoin transfer transaction. We do not implement here. */
	//Message.createBurn = function() {};
	
	static createCancel(txid: Buffer) {
		return new Message(70, txid);
	};
	
	static createDestroy() {
		throw new Error('Not implemented');
	};
	
	static createDividend(quantity_per_unit: Long|number|string|{low: number, high: number, unsigned: boolean}, asset: string, dividend_asset: string, networkName: 'Bitcoin'|'Monacoin'='Bitcoin') {
		const long_quantity_per_unit = Long.fromValue(quantity_per_unit);
		let asset_id = util.toAssetId(asset, networkName);
		let dividend_asset_id = util.toAssetId(dividend_asset);
		// Create input buffers.
		let buf_quantity_per_unit = Buffer.from(long_quantity_per_unit.toBytesBE());
		let buf_asset_id = Buffer.from(asset_id.toBytesBE());
		let buf_dividend_asset_id = Buffer.from(dividend_asset_id.toBytesBE());
		return new Message(50, Buffer.concat([
			buf_quantity_per_unit,
			buf_asset_id,
			buf_dividend_asset_id,
		]));
	};
	
	static createExecute() {
		throw new Error('Not implemented');
	};
	
	/**
	 * @param network optional.
	 */
	static createIssuance(asset: string, quantity: Long|number|string|{low: number, high: number, unsigned: boolean}, divisible: boolean, description: string, callable: boolean=false, call_date: number=0, call_price: number=0.0, networkName: 'Bitcoin'|'Monacoin'='Bitcoin') {
		// Accept flexible params.
		let asset_id = util.toAssetId(asset, networkName);
		const long_quantity = Long.fromValue(quantity);
		// Create input buffers.
		let buf_asset_id = Buffer.from(asset_id.toBytesBE());
		let buf_quantity = Buffer.from(long_quantity.toBytesBE());
		let buf_divisible = Buffer.from([divisible ? 1 : 0]);
		let buf_callable = Buffer.from([callable ? 1 : 0]);
		let buf_call_date = Buffer.alloc(4);
		buf_call_date.writeUInt32BE(call_date, 0);
		let buf_call_price = Buffer.alloc(4);
		buf_call_price.writeFloatBE(call_price, 0);
		let buf_description = Message.stringToBuffer(description, 42);
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
	
	static createOrder(
		give_id: number|string|Long,
		give_quantity: Long|number|string|{low: number, high: number, unsigned: boolean},
		get_id: number|string|Long,
		get_quantity: Long|number|string|{low: number, high: number, unsigned: boolean},
		expiration: number,
		fee_required: Long|number|string|{low: number, high: number, unsigned: boolean}=0) {
		const long_give_id = util.toAssetId(give_id);
		const long_give_quantity = Long.fromValue(give_quantity);
		const long_get_id = util.toAssetId(get_id);
		const long_get_quantity = Long.fromValue(get_quantity);
		const long_fee_required = Long.fromValue(fee_required);
		// Create input buffers.
		let buf_give_id = Buffer.from(long_give_id.toBytesBE());
		let buf_give_quantity = Buffer.from(long_give_quantity.toBytesBE());
		let buf_get_id = Buffer.from(long_get_id.toBytesBE());
		let buf_get_quantity = Buffer.from(long_get_quantity.toBytesBE());
		let buf_expiration = Buffer.alloc(2);
		buf_expiration.writeUInt16BE(expiration, 0);
		let buf_fee_required = Buffer.from(long_fee_required.toBytesBE());
		return new Message(10, Buffer.concat([
			buf_give_id,
			buf_give_quantity,
			buf_get_id,
			buf_get_quantity,
			buf_expiration,
			buf_fee_required,
		]));
	};
	
	static createPublish() {
		throw new Error('Not implemented');
	};
	
	/* Rock-Paper-Scissors type message is removed. We will not implement here. */
	//Message.createRPS = function() {};
	//Message.createRPSResolve = function() {};
	
	static createSend(asset: string, quantity: Long|number|string|{low: number, high: number, unsigned: boolean}, networkName: 'Bitcoin'|'Monacoin'='Bitcoin') {
		// Accept flexible params.
		let asset_id = util.toAssetId(asset, networkName);
		const long_quantity = Long.fromValue(quantity);
		// Create input buffers.
		let buf_asset_id = Buffer.from(asset_id.toBytesBE());
		let buf_quantity = Buffer.from(long_quantity.toBytesBE());
		return new Message(0, Buffer.concat([
			buf_asset_id,
			buf_quantity,
		]));
	};
	
}

