
declare module "coininfo" {
	import * as bitcoin from 'bitcoinjs-lib';
	export default function coininfo(input: string): { toBitcoinJS: () => bitcoin.Network }|null;
}

