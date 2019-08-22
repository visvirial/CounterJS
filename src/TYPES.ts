
export type Item = {
	label: string;
	type: string;
	length?: number;
	thresholdLen?: number;
};

export type Type = {
	type: string;
	structure: Item[];
};

const TYPES: { [key: number]: Type } = {
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

export default TYPES

