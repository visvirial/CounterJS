CounterJS
=========



[![Build Status](https://travis-ci.org/Fressets/CounterJS.svg?branch=master)](https://travis-ci.org/Fressets/CounterJS)
[![Coverage Status](https://coveralls.io/repos/github/Fressets/CounterJS/badge.svg?branch=master)](https://coveralls.io/github/Fressets/CounterJS?branch=master)



A pure and easy-to-use [Counterparty](https://counterparty.io/) Node.js (JavaScript) library.



Features
--------

 * Can generate or parse Counterparty messages without interaction with a Counterparty server (`counterparty-lib` and/or `blockparty`)
 * Can generate or decode bitcoin transactions with Counterparty messages embedded
 * No specific bitcoin library (e.g. Bitcore and BitcoinJS) dependency. You can use any bitcoin library you prefer
 * [WIP] Browser support



Install
-------

### With NPM

```
$ npm install counterjs
```

### From Source

```
$ git clone https://github.com/fressets/CounterJS
$ cd CounterJS
$ npm install
```

### For browsers

In the source code directory, run

```
$ gulp browser
```

Then browserified JS file `dist/counterjs.js` and minified `dist/counterjs.min.js` will be created.

Load one of the files above in your HTML.

```
<script type="text/javascript" src="__JS_DIR__/counterjs.min.js"></script>
```

Then, you can `require('counterjs')` to load the module.

```
var xcp = require('counterjs');

// Do the stuff!!!
```



Basic Usage
-----------

We will show a code for generating private key (WIF) and address associated with a given mnemonic (passphrase) as an example.

Please refer to the [/sample](/sample) directory for more advanced usage.

### Node.js

```
// Load CounterJS module.
var xcp = require('counterjs');

// Inputs.
// Mnemonic code (passphrase).
var mnemonic = 'blood honor rude click strength plain stare movie grab long hardly tease';
// Address index.
var index = 0;

// Compute a private key (WIF format).
var wif = xcp.util.mnemonicToPrivateKey(mnemonic, index, 'mainnet');
// Compute an address (using BitcoinJS).
var address = require('bitcoinjs-lib').ECPair.fromWIF(wif).getAddress();
// ...or you can use Bitcore instead.
//var address = new require('bitcore-lib').PrivateKey(wif).toAddress().toString();

// Print the results.
console.log('WIF: ' + wif);
console.log('address: ' + address);
```

### Browser

```
Under preparation.
```



API Reference
-------------

### xcp.Message

[WIP]

### xcp.util

[WIP]



Miscellaneous
-------------

### Running Tests

To run all tests, run

```
$ mocha
```

If you want to run a specific test, run

```
$ mocha ./test/FILE.js
```

Replace `FILE.js` with a test file you want to run.

### Gulp Tasks

#### jshint

It will run `jshint`. Please run this task before you make a pull request and check if your code passes the jshint check.

### Design Guideline

 * Input to / output from any API call should not depend on any other libraries - e.g. do not return `bitcore.PrivateKey` instance, return a WIF string or a 256-bit BitInteger instead
 * Write a readable code rather than fast code



