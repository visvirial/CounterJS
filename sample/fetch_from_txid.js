
var request = require('request');
var xcp = require('../');

const EXPLORER_TX = 'https://api.blockcypher.com/v1/btc/test3/txs/:TXID:?includeHex=true';

if(process.argv.length < 3) {
	console.log('usage: node fetch_from_txid TXID');
	console.log('Fetch a transaction data of a given TXID from BlockCypher and parse it.');
	process.exit(1);
}

var txid = process.argv[2];

request(EXPLORER_TX.replace(':TXID:', txid), function(err, req, body) {
	if(err) throw new Error('Failed to access to the blockexplorer: ' + err.toString());
	var json = JSON.parse(body);
	if(json.error) throw new Error('Failed to fetch transaction data: ' + json.error);
	var key = Buffer.from(json.inputs[0].prev_hash, 'hex');
	for(var i in json.outputs) {
		var out = json.outputs[i];
		if(out.script_type == 'null-data') {
			try {
				json.outputs[i].message = xcp.Message.fromEncrypted(key, Buffer.from(out.data_hex, 'hex')).toJSON();
			} catch(e) {
				// Maybe a non-counterparty transaction...
			}
		}
	}
	console.log(JSON.stringify(json, null, '  '));
});

