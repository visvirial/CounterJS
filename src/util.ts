
import Long from 'long';
import coininfo from 'coininfo';
import * as bitcoin from 'bitcoinjs-lib';
import bufferReverse from 'buffer-reverse';

import Message from './Message';

const KEY_ASSETS = {
	Bitcoin: [ 'BTC', 'XCP' ],
	Monacoin: [ 'MONA', 'XMP' ]
};

const B26DIGITS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const MNEMONIC_WORDS = require('./mnemonic_words.json');
const MAX_OP_RETURN = 80;

const getBitcoinJSNetwork = (str: string='mainnet'): bitcoin.Network => {
	switch(str) {
		case 'mainnet':
			return bitcoin.networks.bitcoin;
		case 'testnet':
			return bitcoin.networks.testnet;
		default:
			const ci = coininfo(str);
			if(ci === null) throw new Error('Invalid network name specified');
			return ci.toBitcoinJS();
	}
};

/**
 * Encrypt/Decrypt given data using (A)RC4.
 */
const arc4 = (key: Buffer, data: Buffer): Buffer => {
	let S = [];
	for(let i=0; i<256; i++) {
		S[i] = i;
	}
	for(let i=0,j=0; i<256; i++) {
		j = (j + S[i] + key[i % key.length]) % 256;
		[S[i], S[j]] = [S[j], S[i]];
	}
	let ret = [];
	for(let x=0,i=0,j=0; x<data.length; x++) {
		i = (i + 1) % 256;
		j = (j + S[i]) % 256;
		[S[i], S[j]] = [S[j], S[i]];
		let K = S[(S[i] + S[j]) % 256];
		ret.push(data[x] ^ K);
	}
	return Buffer.from(ret);
};

/**
 * Recover a WIF from a given passphrase.
 * @param passphrase If array of length 2, [menmonic, password]. Otherwise, mnemonic.
 * @return String WIF format private key.
 */
const mnemonicToPrivateKey = (passphrase: string[2]|string, index: number, network?: string): string => {
	let getMnemonic = (data: string[2]|string): string[] => {
		if(data.length == 2) {
			throw new Error('Password is not implemented yet');
		} else {
			return data.split(' ');
		}
	};
	const mnemonic = getMnemonic(passphrase);
	if(mnemonic.length%3 !== 0) {
		throw new Error('The length of mnemonic array should be divisible by 3');
	}
	let seed = Buffer.alloc(4*mnemonic.length/3);
	const N = MNEMONIC_WORDS.length;
	let mod = (a: number, b: number): number => {
		return a - Math.floor(a/b)*b;
	};
	for(let i=0; i<mnemonic.length/3; i++) {
		let w1 = MNEMONIC_WORDS.indexOf(mnemonic[3*i+0]);
		let w2 = MNEMONIC_WORDS.indexOf(mnemonic[3*i+1]);
		let w3 = MNEMONIC_WORDS.indexOf(mnemonic[3*i+2]);
		if(w1<0) throw new Error('Invalid word specified: ' + mnemonic[3*i+0]);
		if(w2<0) throw new Error('Invalid word specified: ' + mnemonic[3*i+1]);
		if(w3<0) throw new Error('Invalid word specified: ' + mnemonic[3*i+2]);
		seed.writeUInt32BE(w1 + N*mod(w2-w1, N) + N*N*mod(w3-w2, N), 4*i);
	}
	let master = (<any>bitcoin).HDNode.fromSeedBuffer(seed, getBitcoinJSNetwork(network));
	return master.derivePath('m/0\'/0/'+index).keyPair.toWIF();
};

const assetIdToName = (asset_id: Long, networkName: 'Bitcoin'|'Monacoin'='Bitcoin'): string => {
	if(asset_id.equals(0)) return KEY_ASSETS[networkName][0];
	if(asset_id.equals(1)) return KEY_ASSETS[networkName][1];
	if(asset_id.lessThan(26 * 26 * 26)) {
		throw new Error('Asset ID is too low');
	}
	// We assume numeric asset is enabled.
	if(asset_id.greaterThan(Long.fromString(/*26^12*/'95428956661682176'))) {
		return 'A' + asset_id.toString();
	}
	let asset_name = '';
	let rem = Long.fromValue(asset_id);
	for(;rem.greaterThan(0); rem=rem.divide(26)) {
		let r = rem.mod(26);
		asset_name = B26DIGITS[r.toInt()] + asset_name;
	}
	return asset_name;
};

const assetNameToId = (asset_name: string, networkName: 'Bitcoin'|'Monacoin'='Bitcoin'): Long => {
	if(asset_name === KEY_ASSETS[networkName][0]) return Long.fromInt(0);
	if(asset_name === KEY_ASSETS[networkName][1]) return Long.fromInt(1);
	if(asset_name.length < 4) {
		throw new Error('Asset name is too short');
	}
	// We assume numeric asset is enabled.
	if(asset_name[0] == 'A') {
		// Check the format
		if(!asset_name.match(/^A[0-9]+$/)) {
			throw new Error('Non-numeric asset name should not start with "A"');
		}
		let asset_id = Long.fromString(asset_name.substr(1), true);
		if(!asset_id.greaterThan(Long.fromString(/*26^12*/'95428956661682176', true))) {
			throw new Error('Asset ID is too small');
		}
		return asset_id;
	}
	if(asset_name.length >= 13) {
		throw new Error('Asset name is too long');
	}
	let asset_id = Long.fromInt(0);
	for(const c of asset_name.split('')) {
		const n = B26DIGITS.search(c);
		if(n < 0) throw new Error('Invalid character: ' + c);
		asset_id = asset_id.multiply(26).add(n);
	}
	if(asset_id.lessThan(26 * 26 * 26)) {
		throw new Error('Asset ID is too low');
	}
	return asset_id;
};

/**
 * Convert given data to asset ID.
 */
const toAssetId = (asset: number|string|Long, networkName: 'Bitcoin'|'Monacoin'='Bitcoin'): Long => {
	if(asset instanceof Long) return Long.fromValue(asset);
	if(typeof asset == 'number') {
		return Long.fromInt(asset, true);
	}
	if(typeof asset == 'string') {
		// If start from A.
		if(asset[0] == 'A') {
			return Long.fromString(asset.substr(1), true);
		}
		return assetNameToId(asset, networkName);
	}
	throw new Error('Invalid asset type');
};

/**
 * Build a new Counterparty transaction.
 * @param Array inputs Each item should contain "String txid" and "Integer vout".
 * @param String/Object dest Destination output. Address for string. For object, format is {address: DEST_ADDR, value: SEND_AMOUNT}. If dest.value is omitted, the dust threashold (5430 satoshis) is assumed.
 * @param Message message A message to send.
 * @param Object change Excess bitcoins are paid to this address. Fromat: {address: CHANGE_ADDR, value: AMOUNT, fee_per_kb: FEE_PER_KB}. If fee_per_kb is specified, the fee amount will be determined from a transaction size and `value` will be ignored.
 * @return Buffer The unsinged raw transaction. You should sign it before broadcasting.
 */
const buildTransaction = (inputs: { txid: string, vout: number }[], dest: string|{ address: string, value?: number }, message: Message, change: {address: string, value: number, fee_per_kb?: number}, networkName: 'Bitcoin'|'Monacoin'='Bitcoin', oldStyle: boolean=false) => {
	let tx = new bitcoin.Transaction();
	// Add inputs.
	for(const input of inputs) {
		const hash = Buffer.from(bufferReverse(Buffer.from(input.txid)).join(''), 'hex');
		tx.addInput(hash, input.vout);
	}
	// Add destination output.
	if(dest) {
		if(typeof dest == 'string') {
			dest = {
				address: dest,
				value: 5430,
			};
		}
		tx.addOutput(bitcoin.address.toOutputScript(dest.address, getBitcoinJSNetwork(networkName)), dest.value||5430);
	}
	// Add message.
	let encrypted = message.toEncrypted(Buffer.from(inputs[0].txid), oldStyle);
	for(let bytesWrote=0; bytesWrote<encrypted.length; bytesWrote+=MAX_OP_RETURN) {
		tx.addOutput((<any>bitcoin.script).nullDataOutput(encrypted.slice(bytesWrote, bytesWrote+MAX_OP_RETURN)), 0);
	}
	// Add change.
	if(change.fee_per_kb) throw new Error('Calculating fee from change.fee_per_kb is not supported yet');
	tx.addOutput(bitcoin.address.toOutputScript(change.address, getBitcoinJSNetwork(networkName)), change.value);
	return tx.toBuffer();
};

const parseTransaction = (rawtx: Buffer, networkName: 'Bitcoin'|'Monacoin'='Bitcoin') => {
	let network = getBitcoinJSNetwork(networkName);
	let tx = null
	if(rawtx instanceof Buffer) {
		tx = bitcoin.Transaction.fromBuffer(rawtx);
	}
	if(typeof rawtx == 'string') {
		tx = bitcoin.Transaction.fromHex(rawtx);
	}
	if(!tx) {
		throw new Error('Invalid data type for rawtx');
	}
	// Get encryption key.
	let key = bufferReverse(tx.ins[0].hash);
	// Parse input to determine source pubkey.
	let source = ((inputs) => {
		let sources: Buffer[] = [];
		for(let i in inputs) {
			let input = inputs[i];
			if(bitcoin.script.classifyInput(input.script) == 'pubkeyhash') {
				let pubkey = <Buffer>bitcoin.script.decompile(input.script)[1];
				sources.push(pubkey);
			}
		}
		// All input sources should be identical.
		for(let i=1; i<sources.length; i++) {
			if(!sources[0].equals(sources[i])) {
				return null;
			}
		}
		return sources[0];
	})(tx.ins);
	// Parse output.
	let destination = null;
	let rawdata = Buffer.alloc(0);
	for(let i in tx.outs) {
		let out = tx.outs[i];
		let type = bitcoin.script.classifyOutput(out.script);
		if(type == 'pubkeyhash') {
			if(!destination && rawdata.length===0) {
				destination = {
					address: bitcoin.address.toBase58Check(out.script.slice(3, 23), network.pubKeyHash),
					amount: out.value,
				};
			}
		}
		if(type == 'nulldata') {
			rawdata = arc4(key, <Buffer>bitcoin.script.decompile(out.script)[1]);
		}
		if(type == 'multisig') {
			let decrypted = arc4(key, Buffer.concat([out.script.slice(3, 33), out.script.slice(36, 68)]));
			rawdata = Buffer.concat([rawdata, decrypted.slice(1, 1+decrypted[0])]);
		}
	}
	let message;
	try {
		message = require('./Message').fromSerialized(rawdata);
	} catch(e) {
		// maybe non-Counterparty tx.
	}
	return {
		key: key,
		sourcePublicKey: source,
		destination: destination,
		message: message,
	};
};

export {
	getBitcoinJSNetwork,
	arc4,
	mnemonicToPrivateKey,
	assetIdToName,
	assetNameToId,
	toAssetId,
	buildTransaction,
	parseTransaction,
};

