import { Side, OrderType } from "@polymarket/clob-client";
// GTC Order example
//

async function GTC_Order_Example() {
  // Create a buy order for 100 YES for 0.50c
  // YES: 71321045679252212594626385532706912750332728571942532289631379312455583992563
  const order = await clobClient.createOrder({
    tokenID:
      "71321045679252212594626385532706912750332728571942532289631379312455583992563",
    price: 0.5,
    side: Side.BUY,
    size: 100,
    feeRateBps: 0,
    nonce: 1,
  });
  console.log("Created Order", order);

  // Send it to the server

  // GTC Order
  const resp = await clobClient.postOrder(order, OrderType.GTC);
  console.log(resp);
}

GTC_Order_Example();
// GTD Order example
//

async function GTD_Order_Example() {
  // Create a buy order for 100 YES for 0.50c that expires in 1 minute
  // YES: 71321045679252212594626385532706912750332728571942532289631379312455583992563

  // There is a 1 minute of security threshold for the expiration field.
  // If we need the order to expire in 30 seconds the correct expiration value is:
  // now + 1 miute + 30 seconds
  const oneMinute = 60 * 1000;
  const seconds = 30 * 1000;
  const expiration = parseInt(
    ((new Date().getTime() + oneMinute + seconds) / 1000).toString()
  );

  const order = await clobClient.createOrder({
    tokenID:
      "71321045679252212594626385532706912750332728571942532289631379312455583992563",
    price: 0.5,
    side: Side.BUY,
    size: 100,
    feeRateBps: 0,
    nonce: 1,
    // There is a 1 minute of security threshold for the expiration field.
    // If we need the order to expire in 30 seconds the correct expiration value is:
    // now + 1 miute + 30 seconds
    expiration: expiration,
  });
  console.log("Created Order", order);

  // Send it to the server

  // GTD Order
  const resp = await clobClient.postOrder(order, OrderType.GTD);
  console.log(resp);
}

GTD_Order_Example();
// FOK BUY Order example
//

async function Order_Example() {
  // Create a market buy order for $100
  // YES: 71321045679252212594626385532706912750332728571942532289631379312455583992563

  const marketOrder = await clobClient.createMarketOrder({
    side: Side.BUY,
    tokenID:
      "71321045679252212594626385532706912750332728571942532289631379312455583992563",
    amount: 100, // $$$
    feeRateBps: 0,
    nonce: 0,
    price: 0.5,
  });
  console.log("Created Order", order);

  // Send it to the server
  // FOK Order
  const resp = await clobClient.postOrder(order, OrderType.FOK);
  console.log(resp);
}

Order_Example();
// FOK SELL Order example
//

async function FOX_Sell_Example() {
  // Create a market sell order for 100 shares
  // YES: 71321045679252212594626385532706912750332728571942532289631379312455583992563

  const marketOrder = await clobClient.createMarketOrder({
    side: Side.SELL,
    tokenID:
      "71321045679252212594626385532706912750332728571942532289631379312455583992563",
    amount: 100, // shares
    feeRateBps: 0,
    nonce: 0,
    price: 0.5,
  });
  console.log("Created Order", order);

  // Send it to the server
  // FOK Order
  const resp = await clobClient.postOrder(order, OrderType.FOK);
  console.log(resp);
}

FOX_Sell_Example();