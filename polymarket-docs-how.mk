# READ ONLY

This file is a merged representation of a subset of the codebase, containing specifically included files and files not matching ignore patterns, combined into a single document by Repomix.
The content has been processed where comments have been removed, empty lines have been removed, content has been compressed (code blocks are separated by ⋮---- delimiter).


```

Developer Quickstart
Endpoints
​
REST

Used for all CLOB REST endpoints, denoted {clob-endpoint}.

https://clob.polymarket.com/
​
Data-API

An additional endpoint that delivers user data, holdings, and other on-chain activities. https://data-api.polymarket.com/
​
WebSocket

Used for all CLOB WSS endpoints, denoted {wss-channel}.

wss://ws-subscriptions-clob.polymarket.com/ws/
API Rate Limits
Your First Order
github
Powered by Mintlify
On this page

	REST
	Data-API
	WebSocket

Endpoints - Polymarket Documentation
```


```

Developer Quickstart
Your First Order

Placing your first order using one of our two Clients is relatively straightforward.

For Python: pip install py-clob-client.

For Typescript: npm install polymarket/clob-client & npm install ethers.

After installing one of those you will be able to run the below code. Take the time to fill in the constants at the top and ensure you’re using the proper signature type based on your login method.
Copy
Ask AI

//npm install @polymarket/clob-client
//npm install ethers
//Client initialization example and dumping API Keys

import { ApiKeyCreds, ClobClient, OrderType, Side, } from "@polymarket/clob-client";
import { Wallet } from "@ethersproject/wallet";

const host = 'https://clob.polymarket.com';
const funder = '';//This is your Polymarket Profile Address, where you send UDSC to. 
const signer = new Wallet(""); //This is your Private Key. If using email login export from https://reveal.magic.link/polymarket otherwise export from your Web3 Application


//In general don't create a new API key, always derive or createOrDerive
const creds = new ClobClient(host, 137, signer).createOrDeriveApiKey();

//0: Browser Wallet(Metamask, Coinbase Wallet, etc)
//1: Magic/Email Login
const signatureType = 1; 
  (async () => {
	const clobClient = new ClobClient(host, 137, signer, await creds, signatureType, funder);
	const resp2 = await clobClient.createAndPostOrder(
		{
			tokenID: "", //Use https://docs.polymarket.com/developers/gamma-markets-api/get-markets to grab a sample token
			price: 0.01,
			side: Side.BUY,
			size: 5,
			feeRateBps: 0,
		},
		{ tickSize: "0.001",negRisk: false }, //You'll need to adjust these based on the market. Get the tickSize and negRisk T/F from the get-markets above
		//{ tickSize: "0.001",negRisk: true },

		OrderType.GTC, 
	);
	console.log(resp2)
  })();

​
In addition to detailed comments in the code snippet, here are some more tips to help you get started.

	See the Python example for details on the proper way to intialize a Py-Clob-Client depending on your wallet type. Three exhaustive examples are given. If using a MetaMask wallet or EOA please see the resources here, for instructions on setting allowances.
	When buying into a market you purchase a “Token” that token represents either a Yes or No outcome of the event. To easily get required token pairs for a given event we have provided an interactive endpoint here.
	Common pitfalls:
		Negrisk Markets require an additional flag in the OrderArgs negrisk=False
		invalid signature error, likely due to one of the following.
			Incorrect Funder and or Private Key
			Incorrect NegRisk flag in your order arguments
		not enough balance / allowance.
			Not enough USDC to perform the trade. See the formula at the bottom of this page for details.
			If using Metamask / WEB3 wallet go here, for instructions on setting allowances.

Endpoints
Cancelling Orders
github
Powered by Mintlify
On this page

	In addition to detailed comments in the code snippet, here are some more tips to help you get started.

Your First Order - Polymarket Documentation
```

```

Developer Quickstart
Cancelling Orders
​
Cancel an single Order
This endpoint requires a L2 Header.

Cancel an order.

HTTP REQUEST

DELETE /<clob-endpoint>/order
​
Request Payload Parameters
Name	Required	Type	Description
orderID	yes	string	ID of order to cancel
​
Response Format
Name	Type	Description
canceled	string[]	list of canceled orders
not_canceled		a order id -> reason map that explains why that order couldn’t be canceled
Copy
Ask AI

async function main() {
  // Send it to the server
  const resp = await clobClient.cancelOrder({
	orderID:
	  "0x38a73eed1e6d177545e9ab027abddfb7e08dbe975fa777123b1752d203d6ac88",
  });
  console.log(resp);
  console.log(`Done!`);
}
main();

​
Cancel Multiple Orders
This endpoint requires a L2 Header.

HTTP REQUEST

DELETE /<clob-endpoint>/orders
​
Request Payload Parameters
Name	Required	Type	Description
null	yes	string[]	IDs of the orders to cancel
​
Response Format
Name	Type	Description
canceled	string[]	list of canceled orders
not_canceled		a order id -> reason map that explains why that order couldn’t be canceled
Copy
Ask AI

async function main() {
  // Send it to the server
  const resp = await clobClient.cancelOrders([
	"0x38a73eed1e6d177545e9ab027abddfb7e08dbe975fa777123b1752d203d6ac88",
	"0xaaaa...",
  ]);
  console.log(resp);
  console.log(`Done!`);
}
main();

​
Cancel ALL Orders
This endpoint requires a L2 Header.

Cancel all open orders posted by a user.

HTTP REQUEST

DELETE /<clob-endpoint>/cancel-all
​
Response Format
Name	Type	Description
canceled	string[]	list of canceled orders
not_canceled		a order id -> reason map that explains why that order couldn’t be canceled
Copy
Ask AI

async function main() {
  const resp = await clobClient.cancelAll();
  console.log(resp);
  console.log(`Done!`);
}

main();

​
Cancel orders from market
This endpoint requires a L2 Header.

Cancel orders from market.

HTTP REQUEST

DELETE /<clob-endpoint>/cancel-market-orders
​
Request Payload Parameters
Name	Required	Type	Description
market	no	string	condition id of the market
asset_id	no	string	id of the asset/token
​
Response Format
Name	Type	Description
canceled	string[]	list of canceled orders
not_canceled		a order id -> reason map that explains why that order couldn’t be canceled
Copy
Ask AI

async function main() {
  // Send it to the server
  const resp = await clobClient.cancelMarketOrders({
	market:
	  "0xbd31dc8a20211944f6b70f31557f1001557b59905b7738480ca09bd4532f84af",
	asset_id:
	  "52114319501245915516055106046884209969926127482827954674443846427813813222426",
  });
  console.log(resp);
  console.log(`Done!`);
}
main();

Your First Order
CLOB Introduction
github
Powered by Mintlify
On this page

	Cancel an single Order
	Request Payload Parameters
	Response Format
	Cancel Multiple Orders
	Request Payload Parameters
	Response Format
	Cancel ALL Orders
	Response Format
	Cancel orders from market
	Request Payload Parameters
	Response Format

Cancelling Orders - Polymarket Documentation
```


```

Central Limit Order Book
CLOB Introduction

Welcome to the Polymarket Order Book API! This documentation provides overviews, explanations, examples, and annotations to simplify interaction with the order book. The following sections detail the Polymarket Order Book and the API usage.
​
System

Polymarket’s Order Book, or CLOB (Central Limit Order Book), is hybrid-decentralized. It includes an operator for off-chain matching/ordering, with settlement executed on-chain, non-custodially, via signed order messages.

The exchange uses a custom Exchange contract facilitating atomic swaps between binary Outcome Tokens (CTF ERC1155 assets and ERC20 PToken assets) and collateral assets (ERC20), following signed limit orders. Designed for binary markets, the contract enables complementary tokens to match across a unified order book.

Orders are EIP712-signed structured data. Matched orders have one maker and one or more takers, with price improvements benefiting the taker. The operator handles off-chain order management and submits matched trades to the blockchain for on-chain execution.
​
API

The Polymarket Order Book API enables market makers and traders to programmatically manage market orders. Orders of any amount can be created, listed, fetched, or read from the market order books. Data includes all available markets, market prices, and order history via REST and WebSocket endpoints.
​
Security

Polymarket’s Exchange contract has been audited by Chainsecurity (View Audit).

The operator’s privileges are limited to order matching, non-censorship, and ensuring correct ordering. Operators can’t set prices or execute unauthorized trades. Users can cancel orders on-chain independently if trust issues arise.
​
Fees
​
Schedule

	Subject to change

Volume Level	Maker Fee Base Rate (bps)	Taker Fee Base Rate (bps)
>0 USDC	0	0
​
Overview

Fees apply symmetrically in output assets (proceeds). This symmetry ensures fairness and market integrity. Fees are calculated differently depending on whether you are buying or selling:

	Selling outcome tokens (base) for collateral (quote):

feeQuote=baseRate×min⁡(price,1−price)×size
feeQuote=baseRate×min(price,1−price)×size

	Buying outcome tokens (base) with collateral (quote):

feeBase=baseRate×min⁡(price,1−price)×sizeprice
feeBase=baseRate×min(price,1−price)×pricesize​
​
Additional Resources

	Exchange contract source code
	Exchange contract documentation

Cancelling Orders
Deployments
github
Powered by Mintlify
On this page

	System
	API
	Security
	Fees
	Schedule
	Overview
	Additional Resources

CLOB Introduction - Polymarket Documentation
```



```

Central Limit Order Book
Deployments

The Exchange contract addresses for different networks:
Network	Address
Polygon:	0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E
CLOB Introduction
Status
github
Powered by Mintlify

Deployments - Polymarket Documentation
```



```

Central Limit Order Book
Status

Check the status of the Polymarket Order Book:

Status Page
Deployments
Clients
github
Powered by Mintlify

Status - Polymarket Documentation
```







```

Central Limit Order Book
Clients

Polymarket has implemented reference clients that allow programmatic use of the API below:

	clob-client (Typescript)
	py-clob-client (Python)

Copy
Ask AI

//npm install @polymarket/clob-client
//npm install ethers
//Client initialization example and dumping API Keys

import { ApiKeyCreds, ClobClient} from "@polymarket/clob-client";
import { Wallet } from "@ethersproject/wallet";

const host = 'https://clob.polymarket.com';
const funder = '';//This is your Polymarket Profile Address, where you send UDSC to. 
const signer = new Wallet(""); //This is your Private Key. If using email login export from https://reveal.magic.link/polymarket otherwise export from your Web3 Application

//In general don't create a new API key, always derive or createOrDerive
const creds = new ClobClient(host, 137, signer).createOrDeriveApiKey();

//0: Browser Wallet(Metamask, Coinbase Wallet, etc)
//1: Magic/Email Login
const signatureType = 1; 
  
(async () => {
	const clobClient = new ClobClient(host, 137, signer, await creds, signatureType, funder);
})


​
Order Utils

Polymarket has implemented utility libraries to programmatically sign and generate orders:

	clob-order-utils (Typescript)
	python-order-utils (Python)
	go-order-utils (Golang)

Status
Authentication
github
Powered by Mintlify
On this page

	Order Utils

Clients - Polymarket Documentation
```




```

Central Limit Order Book
Authentication

There are two levels of authentication to be considered when using Polymarket’s CLOB.
All signing can be handled directly by the client libraries.
​
L1: Private Key Authentication

The highest level of authentication is via an account’s Polygon private key.
The private key remains in control of a user’s funds and all trading is non-custodial.
The operator never has control over users’ funds.

Private key authentication is required for:

	Placing an order (for signing the order)
	Creating or revoking API keys

​
L1 Header
Header	Required?	Description
POLY_ADDRESS	yes	Polygon address
POLY_SIGNATURE	yes	CLOB EIP 712 signature
POLY_TIMESTAMP	yes	Current UNIX timestamp
POLY_NONCE	yes	Nonce. Default 0

The POLY_SIGNATURE is generated by signing the following EIP-712 struct.

Implementations exist in:

	Typescript
	Python

​
Signing Example
Copy
Ask AI

const domain = {
	name: "ClobAuthDomain",
	version: "1",
	chainId: chainId, // Polygon Chain ID 137
};

const types = {
	ClobAuth: [
		{ name: "address", type: "address" },
		{ name: "timestamp", type: "string" },
		{ name: "nonce", type: "uint256" },
		{ name: "message", type: "string" },
	],
};

const value = {
	address: signingAddress, // The Signing address
	timestamp: ts,            // The CLOB API server timestamp
	nonce: nonce,             // The nonce used
	message: "This message attests that I control the given wallet", // Static message
};

const sig = await signer._signTypedData(domain, types, value);

​
L2: API Key Authentication

The next level of authentication consists of the API key, secret, and passphrase.
These are used solely to authenticate API requests made to Polymarket’s CLOB, such as posting/canceling orders or retrieving an account’s orders and fills.

When a user on-boards via:
Copy
Ask AI

POST /auth/api-key

the server uses the signature as a seed to deterministically generate credentials.
An API credential includes:

	key: UUID identifying the credentials
	secret: Secret string used to generate HMACs (not sent with requests)
	passphrase: Secret string sent with each request, used to encrypt/decrypt the secret (never stored)

All private endpoints require an API key signature (L2 Header).
​
L2 Header
Header	Required?	Description
POLY_ADDRESS	yes	Polygon address
POLY_SIGNATURE	yes	HMAC signature for request
POLY_TIMESTAMP	yes	Current UNIX timestamp
POLY_API_KEY	yes	Polymarket API key
POLY_PASSPHRASE	yes	Polymarket API key passphrase
​
API Key Operations
​
Create API Key
This endpoint requires an L1 Header.

Create new API key credentials for a user.

HTTP Request:
Copy
Ask AI

POST {clob-endpoint}/auth/api-key

​
Derive API Key
This endpoint requires an L1 Header.

Derive an existing API key for an address and nonce.

HTTP Request:
Copy
Ask AI

GET {clob-endpoint}/auth/derive-api-key

​
Get API Keys
This endpoint requires an L2 Header.

Retrieve all API keys associated with a Polygon address.

HTTP Request:
Copy
Ask AI

GET {clob-endpoint}/auth/api-keys

​
Delete API Key
This endpoint requires an L2 Header.

Delete an API key used to authenticate a request.

HTTP Request:
Copy
Ask AI

DELETE {clob-endpoint}/auth/api-key

​
Access Status

Check the value of cert_required by signer address.

HTTP Request:
Copy
Ask AI

GET {clob-endpoint}/auth/access-status

​
Get Closed Only Mode Status
This endpoint requires an L2 Header.

Retrieve the closed-only mode flag status.

HTTP Request:
Copy
Ask AI

GET {clob-endpoint}/auth/ban-status/closed-only

Clients
Orders Overview
github
Powered by Mintlify
On this page

	L1: Private Key Authentication
	L1 Header
	Signing Example
	L2: API Key Authentication
	L2 Header
	API Key Operations
	Create API Key
	Derive API Key
	Get API Keys
	Delete API Key
	Access Status
	Get Closed Only Mode Status

Authentication - Polymarket Documentation
```





```

Order Manipulation
Orders Overview

Detailed instructions for creating, placing, and managing orders using Polymarket’s CLOB API.

All orders are expressed as limit orders (can be marketable). The underlying order primitive must be in the form expected and executable by the on-chain binary limit order protocol contract. Preparing such an order is quite involved (structuring, hashing, signing), thus Polymarket suggests using the open source typescript, python and golang libraries.
​
Allowances

To place an order, allowances must be set by the funder address for the specified maker asset for the Exchange contract. When buying, this means the funder must have set a USDC allowance greater than or equal to the spending amount. When selling, the funder must have set an allowance for the conditional token that is greater than or equal to the selling amount. This allows the Exchange contract to execute settlement according to the signed order instructions created by a user and matched by the operator.
​
Signature Types

Polymarket’s CLOB supports 3 signature types. Orders must identify what signature type they use. The available typescript and python clients abstract the complexity of signing and preparing orders with the following signature types by allowing a funder address and signer type to be specified on initialization. The supported signature types are:
Type	ID	Description
EOA	0	EIP712 signature signed by an EOA
POLY_PROXY	1	EIP712 signatures signed by a signer associated with funding Polymarket proxy wallet
POLY_GNOSIS_SAFE	2	EIP712 signatures signed by a signer associated with funding Polymarket gnosis safe wallet
​
Validity Checks

Orders are continually monitored to make sure they remain valid. Specifically, this includes continually tracking underlying balances, allowances and on-chain order cancellations. Any maker that is caught intentionally abusing these checks (which are essentially real time) will be blacklisted.

Additionally, there are rails on order placement in a market. Specifically, you can only place orders that sum to less than or equal to your available balance for each market. For example if you have 500 USDC in your funding wallet, you can place one order to buy 1000 YES in marketA @ $.50, then any additional buy orders to that market will be rejected since your entire balance is reserved for the first (and only) buy order. More explicitly the max size you can place for an order is:
maxOrderSize=underlyingAssetBalance−∑(orderSize−orderFillAmount)
maxOrderSize=underlyingAssetBalance−∑(orderSize−orderFillAmount)
Authentication
Place Single Order
github
Powered by Mintlify
On this page

	Allowances
	Signature Types
	Validity Checks

Orders Overview - Polymarket Documentation
```




```

Order Manipulation
Place Single Order

Detailed instructions for creating, placing, and managing orders using Polymarket’s CLOB API.
​
Create and Place an Order
This endpoint requires a L2 Header

Create and place an order using the Polymarket CLOB API clients. All orders are represented as “limit” orders, but “market” orders are also supported. To place a market order, simply ensure your price is marketable against current resting limit orders, which are executed on input at the best price.

HTTP REQUEST

POST /<clob-endpoint>/order
​
Request Payload Parameters
Name	Required	Type	Description
order	yes	Order	signed object
owner	yes	string	api key of order owner
orderType	yes	string	order type (“FOK”, “GTC”, “GTD”)

An order object is the form:
Name	Required	Type	Description
salt	yes	integer	random salt used to create unique order
maker	yes	string	maker address (funder)
signer	yes	string	signing address
taker	yes	string	taker address (operator)
tokenId	yes	string	ERC1155 token ID of conditional token being traded
makerAmount	yes	string	maximum amount maker is willing to spend
takerAmount	yes	string	minimum amount taker will pay the maker in return
expiration	yes	string	unix expiration timestamp
nonce	yes	string	maker’s exchange nonce of the order is associated
feeRateBps	yes	string	fee rate basis points as required by the operator
side	yes	string	buy or sell enum index
signatureType	yes	integer	signature type enum index
signature	yes	string	hex encoded signature
​
Order types

	FOK: A Fill-Or-Kill order is an market order to buy (in dollars) or sell (in shares) shares that must be executed immediately in its entirety; otherwise, the entire order will be cancelled.
	FAK: A Fill-And-Kill order is a market order to buy (in dollars) or sell (in shares) that will be executed immediately for as many shares as are available; any portion not filled at once is cancelled.
	GTC: A Good-Til-Cancelled order is a limit order that is active until it is fulfilled or cancelled.
	GTD: A Good-Til-Date order is a type of order that is active until its specified date (UTC seconds timestamp), unless it has already been fulfilled or cancelled. There is a security threshold of one minute. If the order needs to expire in 30 seconds the correct expiration value is: now * 1 mute + 30 seconds

​
Response Format
Name	Type	Description
success	boolean	boolean indicating if server-side err (success = false) -> server-side error
errorMsg	string	error message in case of unsuccessful placement (in case success = false, e.g. client-side error, the reason is in errorMsg)
orderId	string	id of order
orderHashes	string[]	hash of settlement transaction order was marketable and triggered a match
​
Insert Error Messages

If the errorMsg field of the response object from placement is not an empty string, the order was not able to be immediately placed. This might be because of a delay or because of a failure. If the success is not true, then there was an issue placing the order. The following errorMessages are possible:
​
Error
Error	Success	Message	Description
INVALID_ORDER_MIN_TICK_SIZE	yes	order is invalid. Price breaks minimum tick size rules	order price isn’t accurate to correct tick sizing
INVALID_ORDER_MIN_SIZE	yes	order is invalid. Size lower than the minimum	order size must meet min size threshold requirement
INVALID_ORDER_DUPLICATED	yes	order is invalid. Duplicated. Same order has already been placed, can’t be placed again	
INVALID_ORDER_NOT_ENOUGH_BALANCE	yes	not enough balance / allowance	funder address doesn’t have sufficient balance or allowance for order
INVALID_ORDER_EXPIRATION	yes	invalid expiration	expiration field expresses a time before now
INVALID_ORDER_ERROR	yes	could not insert order	system error while inserting order
EXECUTION_ERROR	yes	could not run the execution	system error while attempting to execute trade
ORDER_DELAYED	no	order match delayed due to market conditions	order placement delayed
DELAYING_ORDER_ERROR	yes	error delaying the order	system error while delaying order
FOK_ORDER_NOT_FILLED_ERROR	yes	order couldn’t be fully filled, FOK orders are fully filled/killed	FOK order not fully filled so can’t be placed
MARKET_NOT_READY	no	the market is not yet ready to process new orders	system not accepting orders for market yet
​
Insert Statuses

When placing an order, a status field is included. The status field provides additional information regarding the order’s state as a result of the placement. Possible values include:
​
Status
Status	Description
matched	order placed and matched with an existing resting order
live	order placed and resting on the book
delayed	order marketable, but subject to matching delay
unmatched	order marketable, but failure delaying, placement successful
Orders Overview
Place Multiple Orders (Batching)
github
Powered by Mintlify
Copy
Ask AI

from py_clob_client.client import ClobClient
from py_clob_client.clob_types import OrderArgs, OrderType
from py_clob_client.order_builder.constants import BUY

host: str = "https://clob.polymarket.com"
key: str = "" #This is your Private Key. Export from reveal.polymarket.com or from your Web3 Application
chain_id: int = 137 #No need to adjust this
POLYMARKET_PROXY_ADDRESS: str = '' #This is the address you deposit/send USDC to to FUND your Polymarket account.

#Select from the following 3 initialization options to matches your login method, and remove any unused lines so only one client is initialized.


### Initialization of a client using a Polymarket Proxy associated with an Email/Magic account. If you login with your email use this example.
client = ClobClient(host, key=key, chain_id=chain_id, signature_type=1, funder=POLYMARKET_PROXY_ADDRESS)

### Initialization of a client using a Polymarket Proxy associated with a Browser Wallet(Metamask, Coinbase Wallet, etc)
client = ClobClient(host, key=key, chain_id=chain_id, signature_type=2, funder=POLYMARKET_PROXY_ADDRESS)

### Initialization of a client that trades directly from an EOA. 
client = ClobClient(host, key=key, chain_id=chain_id)

## Create and sign a limit order buying 100 YES tokens for 0.50c each
#Refer to the Markets API documentation to locate a tokenID: https://docs.polymarket.com/developers/gamma-markets-api/get-markets

client.set_api_creds(client.create_or_derive_api_creds()) 

order_args = OrderArgs(
	price=0.01,
	size=5.0,
	side=BUY,
	token_id="", #Token ID you want to purchase goes here. 
)
signed_order = client.create_order(order_args)

## GTC(Good-Till-Cancelled) Order
resp = client.post_order(signed_order, OrderType.GTC)
print(resp)

Place Single Order - Polymarket Documentation
```





```

Order Manipulation
Place Multiple Orders (Batching)

Instructions for placing multiple orders(Batch)
This endpoint requires a L2 Header

Polymarket’s CLOB supports batch orders, allowing you to place up to five orders in a single request. Before using this feature, make sure you’re comfortable placing a single order first. You can find the documentation for that here.

HTTP REQUEST

POST /<clob-endpoint>/orders
​
Request Payload Parameters
Name	Required	Type	Description
PostOrder	yes	PostOrders[]	list of signed order objects (Signed Order + Order Type)
owner	yes	string	api key of order owner

A PostOrder object is the form:
Name	Required	Type	Description
order	yes	order	See below table for details on crafting this object
orderType	yes	string	order type (“FOK”, “GTC”, “GTD”, “FAK”)

An order object is the form:
Name	Required	Type	Description
salt	yes	integer	random salt used to create unique order
maker	yes	string	maker address (funder)
signer	yes	string	signing address
taker	yes	string	taker address (operator)
tokenId	yes	string	ERC1155 token ID of conditional token being traded
makerAmount	yes	string	maximum amount maker is willing to spend
takerAmount	yes	string	minimum amount taker will pay the maker in return
expiration	yes	string	unix expiration timestamp
nonce	yes	string	maker’s exchange nonce of the order is associated
feeRateBps	yes	string	fee rate basis points as required by the operator
side	yes	string	buy or sell enum index
signatureType	yes	integer	signature type enum index
signature	yes	string	hex encoded signature
​
Order types

	FOK: A Fill-Or-Kill order is an market order to buy (in dollars) or sell (in shares) shares that must be executed immediately in its entirety; otherwise, the entire order will be cancelled.
	FAK: A Fill-And-Kill order is a market order to buy (in dollars) or sell (in shares) that will be executed immediately for as many shares as are available; any portion not filled at once is cancelled.
	GTC: A Good-Til-Cancelled order is a limit order that is active until it is fulfilled or cancelled.
	GTD: A Good-Til-Date order is a type of order that is active until its specified date (UTC seconds timestamp), unless it has already been fulfilled or cancelled. There is a security threshold of one minute. If the order needs to expire in 30 seconds the correct expiration value is: now * 1 mute + 30 seconds

​
Response Format
Name	Type	Description
success	boolean	boolean indicating if server-side err (success = false) -> server-side error
errorMsg	string	error message in case of unsuccessful placement (in case success = false, e.g. client-side error, the reason is in errorMsg)
orderId	string	id of order
orderHashes	string[]	hash of settlement transaction order was marketable and triggered a match
​
Insert Error Messages

If the errorMsg field of the response object from placement is not an empty string, the order was not able to be immediately placed. This might be because of a delay or because of a failure. If the success is not true, then there was an issue placing the order. The following errorMessages are possible:
​
Error
Error	Success	Message	Description
INVALID_ORDER_MIN_TICK_SIZE	yes	order is invalid. Price breaks minimum tick size rules	order price isn’t accurate to correct tick sizing
INVALID_ORDER_MIN_SIZE	yes	order is invalid. Size lower than the minimum	order size must meet min size threshold requirement
INVALID_ORDER_DUPLICATED	yes	order is invalid. Duplicated. Same order has already been placed, can’t be placed again	
INVALID_ORDER_NOT_ENOUGH_BALANCE	yes	not enough balance / allowance	funder address doesn’t have sufficient balance or allowance for order
INVALID_ORDER_EXPIRATION	yes	invalid expiration	expiration field expresses a time before now
INVALID_ORDER_ERROR	yes	could not insert order	system error while inserting order
EXECUTION_ERROR	yes	could not run the execution	system error while attempting to execute trade
ORDER_DELAYED	no	order match delayed due to market conditions	order placement delayed
DELAYING_ORDER_ERROR	yes	error delaying the order	system error while delaying order
FOK_ORDER_NOT_FILLED_ERROR	yes	order couldn’t be fully filled, FOK orders are fully filled/killed	FOK order not fully filled so can’t be placed
MARKET_NOT_READY	no	the market is not yet ready to process new orders	system not accepting orders for market yet
​
Insert Statuses

When placing an order, a status field is included. The status field provides additional information regarding the order’s state as a result of the placement. Possible values include:
​
Status
Status	Description
matched	order placed and matched with an existing resting order
live	order placed and resting on the book
delayed	order marketable, but subject to matching delay
unmatched	order marketable, but failure delaying, placement successful
Place Single Order
Get Order
github
Powered by Mintlify
Copy
Ask AI

from py_clob_client.client import ClobClient
from py_clob_client.clob_types import OrderArgs, OrderType, PostOrdersArgs
from py_clob_client.order_builder.constants import BUY


host: str = "https://clob.polymarket.com"
key: str = "" ##This is your Private Key. Export from https://reveal.magic.link/polymarket or from your Web3 Application
chain_id: int = 137 #No need to adjust this
POLYMARKET_PROXY_ADDRESS: str = '' #This is the address you deposit/send USDC to to FUND your Polymarket account.

#Select from the following 3 initialization options to matches your login method, and remove any unused lines so only one client is initialized.


### Initialization of a client using a Polymarket Proxy associated with an Email/Magic account. If you login with your email use this example.
client = ClobClient(host, key=key, chain_id=chain_id, signature_type=1, funder=POLYMARKET_PROXY_ADDRESS)

### Initialization of a client using a Polymarket Proxy associated with a Browser Wallet(Metamask, Coinbase Wallet, etc)
client = ClobClient(host, key=key, chain_id=chain_id, signature_type=2, funder=POLYMARKET_PROXY_ADDRESS)

### Initialization of a client that trades directly from an EOA. 
client = ClobClient(host, key=key, chain_id=chain_id)

## Create and sign a limit order buying 100 YES tokens for 0.50c each
#Refer to the Markets API documentation to locate a tokenID: https://docs.polymarket.com/developers/gamma-markets-api/get-markets

client.set_api_creds(client.create_or_derive_api_creds()) 

resp = client.post_orders([
	PostOrdersArgs(
		# Create and sign a limit order buying 100 YES tokens for 0.50 each
		order=client.create_order(OrderArgs(
			price=0.01,
			size=5,
			side=BUY,
			token_id="88613172803544318200496156596909968959424174365708473463931555296257475886634",
		)),
		orderType=OrderType.GTC,  # Good 'Til Cancelled
	),
	PostOrdersArgs(
		# Create and sign a limit order selling 200 NO tokens for 0.25 each
		order=client.create_order(OrderArgs(
			price=0.01,
			size=5,
			side=BUY,
			token_id="93025177978745967226369398316375153283719303181694312089956059680730874301533",
		)),
		orderType=OrderType.GTC,  # Good 'Til Cancelled
	)
])
print(resp)
print("Done!")

Place Multiple Orders (Batching) - Polymarket Documentation
```



```

Order Manipulation
Get Order

Get information about an existing order
This endpoint requires a L2 Header.

Get single order by id.

HTTP REQUEST

GET /<clob-endpoint>/data/order/<order_hash>
​
Request Parameters
Name	Required	Type	Description
id	no	string	id of order to get information about
​
Response Format
Name	Type	Description
order	OpenOrder	order if it exists

An OpenOrder object is of the form:
Name	Type	Description
associate_trades	string[]	any Trade id the order has been partially included in
id	string	order id
status	string	order current status
market	string	market id (condition id)
original_size	string	original order size at placement
outcome	string	human readable outcome the order is for
maker_address	string	maker address (funder)
owner	string	api key
price	string	price
side	string	buy or sell
size_matched	string	size of order that has been matched/filled
asset_id	string	token id
expiration	string	unix timestamp when the order expired, 0 if it does not expire
type	string	order type (GTC, FOK, GTD)
created_at	string	unix timestamp when the order was created
Place Multiple Orders (Batching)
Get Active Orders
github
Powered by Mintlify
Copy
Ask AI

async function main() {
  const order = await clobClient.getOrder(
	"0xb816482a5187a3d3db49cbaf6fe3ddf24f53e6c712b5a4bf5e01d0ec7b11dabc"
  );
  console.log(order);
}

main();

Get Order - Polymarket Documentation
```




```

Order Manipulation
Get Active Orders
This endpoint requires a L2 Header.

Get active order(s) for a specific market.

HTTP REQUEST

GET /<clob-endpoint>/data/orders
​
Request Parameters
Name	Required	Type	Description
id	no	string	id of order to get information about
market	no	string	condition id of market
asset_id	no	string	id of the asset/token
​
Response Format
Name	Type	Description
null	OpenOrder[]	list of open orders filtered by the query parameters
Get Order
Check Order Reward Scoring
github
Powered by Mintlify
Copy
Ask AI

async function main() {
  const resp = await clobClient.getOpenOrders({
	market:
	  "0xbd31dc8a20211944f6b70f31557f1001557b59905b7738480ca09bd4532f84af",
  });
  console.log(resp);
  console.log(`Done!`);
}
main();

Get Active Orders - Polymarket Documentation
```



```

Order Manipulation
Check Order Reward Scoring

Check if an order is eligble or scoring for Rewards purposes
This endpoint requires a L2 Header.

Returns a boolean value where it is indicated if an order is scoring or not.

HTTP REQUEST

GET /<clob-endpoint>/order-scoring?order_id={...}
​
Request Parameters
Name	Required	Type	Description
orderId	yes	string	id of order to get information about
​
Response Format
Name	Type	Description
null	OrdersScoring	order scoring data

An OrdersScoring object is of the form:
Name	Type	Description
scoring	boolean	indicates if the order is scoring or not
​
Check if some orders are scoring

	This endpoint requires a L2 Header.

Returns to a dictionary with boolean value where it is indicated if an order is scoring or not.

HTTP REQUEST

POST /<clob-endpoint>/orders-scoring
​
Request Parameters
Name	Required	Type	Description
orderIds	yes	string[]	ids of the orders to get information about
​
Response Format
Name	Type	Description
null	OrdersScoring	orders scoring data

An OrdersScoring object is a dictionary that indicates the order by if it score.
Get Active Orders
Cancel Orders(s)
github
Powered by Mintlify
Copy
Ask AI

async function main() {
  const scoring = await clobClient.isOrderScoring({
	orderId: "0x...",
  });
  console.log(scoring);
}

main();

async function main() {
  const scoring = await clobClient.areOrdersScoring({
	orderIds: ["0x..."],
  });
  console.log(scoring);
}

main();

Check Order Reward Scoring - Polymarket Documentation
```




```

Order Manipulation
Cancel Orders(s)

Multiple endpoints to cancel a single order, multiple orders, all orders or all orders from a single market.
​
Cancel an single Order
This endpoint requires a L2 Header.

Cancel an order.

HTTP REQUEST

DELETE /<clob-endpoint>/order
​
Request Payload Parameters
Name	Required	Type	Description
orderID	yes	string	ID of order to cancel
​
Response Format
Name	Type	Description
canceled	string[]	list of canceled orders
not_canceled		a order id -> reason map that explains why that order couldn’t be canceled
Copy
Ask AI

async function main() {
  // Send it to the server
  const resp = await clobClient.cancelOrder({
	orderID:
	  "0x38a73eed1e6d177545e9ab027abddfb7e08dbe975fa777123b1752d203d6ac88",
  });
  console.log(resp);
  console.log(`Done!`);
}
main();

​
Cancel Multiple Orders
This endpoint requires a L2 Header.

HTTP REQUEST

DELETE /<clob-endpoint>/orders
​
Request Payload Parameters
Name	Required	Type	Description
null	yes	string[]	IDs of the orders to cancel
​
Response Format
Name	Type	Description
canceled	string[]	list of canceled orders
not_canceled		a order id -> reason map that explains why that order couldn’t be canceled
Copy
Ask AI

async function main() {
  // Send it to the server
  const resp = await clobClient.cancelOrders([
	"0x38a73eed1e6d177545e9ab027abddfb7e08dbe975fa777123b1752d203d6ac88",
	"0xaaaa...",
  ]);
  console.log(resp);
  console.log(`Done!`);
}
main();

​
Cancel ALL Orders
This endpoint requires a L2 Header.

Cancel all open orders posted by a user.

HTTP REQUEST

DELETE /<clob-endpoint>/cancel-all
​
Response Format
Name	Type	Description
canceled	string[]	list of canceled orders
not_canceled		a order id -> reason map that explains why that order couldn’t be canceled
Copy
Ask AI

async function main() {
  const resp = await clobClient.cancelAll();
  console.log(resp);
  console.log(`Done!`);
}

main();

​
Cancel orders from market
This endpoint requires a L2 Header.

Cancel orders from market.

HTTP REQUEST

DELETE /<clob-endpoint>/cancel-market-orders
​
Request Payload Parameters
Name	Required	Type	Description
market	no	string	condition id of the market
asset_id	no	string	id of the asset/token
​
Response Format
Name	Type	Description
canceled	string[]	list of canceled orders
not_canceled		a order id -> reason map that explains why that order couldn’t be canceled
Copy
Ask AI

async function main() {
  // Send it to the server
  const resp = await clobClient.cancelMarketOrders({
	market:
	  "0xbd31dc8a20211944f6b70f31557f1001557b59905b7738480ca09bd4532f84af",
	asset_id:
	  "52114319501245915516055106046884209969926127482827954674443846427813813222426",
  });
  console.log(resp);
  console.log(`Done!`);
}
main();

Check Order Reward Scoring
Onchain Order Info
github
Powered by Mintlify
On this page

	Cancel an single Order
	Request Payload Parameters
	Response Format
	Cancel Multiple Orders
	Request Payload Parameters
	Response Format
	Cancel ALL Orders
	Response Format
	Cancel orders from market
	Request Payload Parameters
	Response Format

Cancel Orders(s) - Polymarket Documentation
```




```

Order Manipulation
Onchain Order Info
​
How do I interpret the OrderFilled onchain event?

Given an OrderFilled event:

	orderHash: a unique hash for the Order being filled
	maker: the user generating the order and the source of funds for the order
	taker: the user filling the order OR the Exchange contract if the order fills multiple limit orders
	makerAssetId: id of the asset that is given out. If 0, indicates that the Order is a BUY, giving USDC in exchange for Outcome tokens. Else, indicates that the Order is a SELL, giving Outcome tokens in exchange for USDC.
	takerAssetId: id of the asset that is received. If 0, indicates that the Order is a SELL, receiving USDC in exchange for Outcome tokens. Else, indicates that the Order is a BUY, receiving Outcome tokens in exchange for USDC.
	makerAmountFilled: the amount of the asset that is given out.
	takerAmountFilled: the amount of the asset that is received.
	fee: the fees paid by the order maker

Cancel Orders(s)
Trades Overview
github
Powered by Mintlify
On this page

	How do I interpret the OrderFilled onchain event?

Onchain Order Info - Polymarket Documentation
```






```

Trades
Trades Overview
​
Overview

All historical trades can be fetched via the Polymarket CLOB REST API. A trade is initiated by a “taker” who creates a marketable limit order. This limit order can be matched against one or more resting limit orders on the associated book. A trade can be in various states as described below. Note: in some cases (due to gas limitations) the execution of a “trade” must be broken into multiple transactions which case separate trade entities will be returned. To associate trade entities, there is a bucket_index field and a match_time field. Trades that have been broken into multiple trade objects can be reconciled by combining trade objects with the same market_order_id, match_time and incrementing bucket_index’s into a top level “trade” client side.
​
Statuses
Status	Terminal?	Description
MATCHED	no	trade has been matched and sent to the executor service by the operator, the executor service submits the trade as a transaction to the Exchange contract
MINED	no	trade is observed to be mined into the chain, no finality threshold established
CONFIRMED	yes	trade has achieved strong probabilistic finality and was successful
RETRYING	no	trade transaction has failed (revert or reorg) and is being retried/resubmitted by the operator
FAILED	yes	trade has failed and is not being retried
Onchain Order Info
Get Trades
github
Powered by Mintlify
On this page

	Overview
	Statuses

Trades Overview - Polymarket Documentation
```




```

Trades
Get Trades
This endpoint requires a L2 Header.

Get trades for the authenticated user based on the provided filters.

HTTP REQUEST

GET /<clob-endpoint>/data/trades
​
Request Parameters
Name	Required	Type	Description
id	no	string	id of trade to fetch
taker	no	string	address to get trades for where it is included as a taker
maker	no	string	address to get trades for where it is included as a maker
market	no	string	market for which to get the trades (condition ID)
before	no	string	unix timestamp representing the cutoff up to which trades that happened before then can be included
after	no	string	unix timestamp representing the cutoff for which trades that happened after can be included
​
Response Format
Name	Type	Description
null	Trade[]	list of trades filtered by query parameters

A Trade object is of the form:
Name	Type	Description
id	string	trade id
taker_order_id	string	hash of taker order (market order) that catalyzed the trade
market	string	market id (condition id)
asset_id	string	asset id (token id) of taker order (market order)
side	string	buy or sell
size	string	size
fee_rate_bps	string	the fees paid for the taker order expressed in basic points
price	string	limit price of taker order
status	string	trade status (see above)
match_time	string	time at which the trade was matched
last_update	string	timestamp of last status update
outcome	string	human readable outcome of the trade
maker_address	string	funder address of the taker of the trade
owner	string	api key of taker of the trade
transaction_hash	string	hash of the transaction where the trade was executed
bucket_index	integer	index of bucket for trade in case trade is executed in multiple transactions
maker_orders	MakerOrder[]	list of the maker trades the taker trade was filled against
type	string	side of the trade: TAKER or MAKER

A MakerOrder object is of the form:
Name	Type	Description
order_id	string	id of maker order
maker_address	string	maker address of the order
owner	string	api key of the owner of the order
matched_amount	string	size of maker order consumed with this trade
fee_rate_bps	string	the fees paid for the taker order expressed in basic points
price	string	price of maker order
asset_id	string	token/asset id
outcome	string	human readable outcome of the maker order
side	string	the side of the maker order. Can be buy or sell
Trades Overview
Get Trades (Data-API)
github
Powered by Mintlify
Copy
Ask AI

async function main() {
  const trades = await clobClient.getTrades({
	market:
	  "0xbd31dc8a20211944f6b70f31557f1001557b59905b7738480ca09bd4532f84af",
	maker_address: await wallet.getAddress(),
  });
  console.log(`trades: `);
  console.log(trades);
}

main();

Get Trades - Polymarket Documentation
```


```

Trades
Get Trades (Data-API)

Alternative endpoint to the GAMMA Get-Trades. Allows users to get trades from all markets and all users. Ordered by timestamp in descending order(most recent trade first).
GET
/
trades

Polymarket provides a simple alternative to the CLOB API for accessing trade data through a basic GET request that doesn’t require L2 headers. This endpoint allows users to retrieve trades from all markets and users. See the schema and example response below for implementation details.
Query Parameters
​
user
string

The address of the user in question
​
limit
integer
default:100

The max number of trades to return, defaults to 100, max 500
Required range: 1 <= x <= 500
​
offset
integer
default:0

The starting index for pagination
Required range: x >= 0
​
takerOnly
boolean
default:true

Flag that determines whether to return only taker orders. Defaults to true. Otherwise return maker and taker orders
​
filterType
enum<string>

Flag indicating whether to filter trades by a parameter
Available options: CASH, 
TOKENS 
​
filterAmount
number

The amount to filter by. Related to filterType above
​
market
string

The condition ID of the market in question. Supports comma separated values
​
side
enum<string>

The side of the trade
Available options: BUY, 
SELL 
Response
200 - application/json

Successful response with trades data
​
proxyWallet
string

The proxy wallet address
​
side
enum<string>

The side of the trade
Available options: BUY, 
SELL 
​
asset
string

The asset identifier (large number as string)
​
conditionId
string

The condition ID
​
size
number

The size of the trade
​
price
number

The price of the trade
​
timestamp
integer

Unix timestamp of the trade
​
title
string

The title of the market
​
slug
string

URL-friendly slug for the market
​
icon
string

URL to the market icon
​
eventSlug
string

URL-friendly slug for the event
​
outcome
string

The outcome of the trade
​
outcomeIndex
integer

The index of the outcome
​
name
string

The name of the trader
​
pseudonym
string

The pseudonym of the trader
​
bio
string

Biography of the trader
​
profileImage
string

URL to the trader's profile image
​
profileImageOptimized
string

URL to the optimized profile image
​
transactionHash
string

The transaction hash
Get Trades
Get Single Market
github
Powered by Mintlify
Copy
Ask AI

curl --request GET \
  --url https://data-api.polymarket.com/trades

Copy
Ask AI

[
  {
	"proxyWallet": "0x6af75d4e4aaf700450efbac3708cce1665810ff1",
	"side": "SELL",
	"asset": "28774665463932631392072718054733378944250725021214679767633993409910",
	"conditionId": "0x1731c2d00c722fa4d53d1bddae549f14cf1870e2cf59dc040e779104667",
	"size": 160.26,
	"price": 0.89,
	"timestamp": 1724210494,
	"title": "2024 August hottest on record?",
	"slug": "2024-august-hottest-on-record",
	"icon": "https://polymarket-upload.s3.us-east-2.amazonaws.com/earth+on+fire.png",
	"eventSlug": "2024-august-hottest-on-record",
	"outcome": "Yes",
	"outcomeIndex": 0,
	"name": "gopfan",
	"pseudonym": "Mean-Record",
	"bio": "",
	"profileImage": "https://polymarket-upload.s3.us-east-2.amazonaws.com/rus_gopfan",
	"profileImageOptimized": "",
	"transactionHash": "0x5620f25e2772f0ec2c5b2f2f814f6e20b52b4363286a9043b626324"
  }
]

Get Trades (Data-API) - Polymarket Documentation
```