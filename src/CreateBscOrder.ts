/* eslint-disable prefer-const */
/* eslint-disable camelcase */
import {BigNumber, hexUtils} from '@0x/utils';
import {LimitOrder, Signature} from '@0x/protocol-utils';
import {zeroExABI} from './zeroExABI';
import {Contract, providers, Wallet} from 'ethers';

const axios = require('axios').default;

enum OrderSide {
  Buy = 1,
  Sell = 2,
}

enum OrderMethod {
  BSC = 2,
}

enum OrderType {
  LimitOrder = 1,
  MarketOrder = 2,
}

// config for each enviroment

let authHeaders = {
  headers: {
    'fcx-api-key': '90_7ammo9stktatqyvbov99m', // insert api key of user
  },
};

// staging
enum OrderNameOfPairId {
  EURV_USDV = 1,
  GBPV_USDV = 2,
  AUDV_USDV = 3,
  USDV_JPYV = 4,
  USDV_HKDV = 5,
  USDV_SGDV = 6,
  USDV_USDT = 7,
}

enum TokenAddress {
  USDV = '0x6a422957767e65144Fe05941A984cF6b736e7C8B',
  EURV = '0x07f936b6Ee10843de79C57184aE0D5cc4B3a3F8C',
  GBPV = '0x51Ae6c6AED073f0d46DeFc8cFEE3F5E4cd8367F3',
  AUDV = '0xEef409D4d7bC6cD8E4f791c5384ad569e30E623D',
  JPYV = '0xc7dfeCBD076D70173D7615Bae0033068Bc790a3A',
  HKDV = '0xAf2107081791e745Ddd494a7447De8A29a0F6309',
  SGDV = '0xB79543490dE41F0DCb87C06ab1deb15FCb55b0e8',
  USDT = '0xB02512a394a8D915551C4dbC4dd89Da6930596AC',
}

const ENV = {
  PrivateKey:
    '0x605219f36b986e2a270ef0f779beeedf4a2055b95d3df9044998c829b978c213',
  ExchangeFcxProxy: '0x671bA355d51a1B58c0634F949ff512baAD994965',
  FcxCreateOrderApi: 'https://api.fcx-staging.velo.org/api/v1/order',
  JsonRpcProvider: 'https://data-seed-prebsc-1-s1.binance.org:8545',
  ChainId: 97,
};

// get fee in database
const fees = {
  limitOrderBsc: '0.0005',
  marketOrderBsc: '0.0035',
};

const priceOrder = '1';
const amountOrder = '0.5';
const walletOfMarketMaker = '0x3f4bBdece2854C034255854Faa3A3Fb632cB309D';
const matcherAddress = '0x3b5FE29c29F50e6ca1086b163039935d712344E6';
const feeRecipientAddress = '0x3b5FE29c29F50e6ca1086b163039935d712344E6';
const orderSideCreated: OrderSide = OrderSide.Buy;

const getAmountByOrderSide = (side: OrderSide) => {
  const ratio = new BigNumber(1).minus(fees.limitOrderBsc);
  if (side === OrderSide.Sell) {
    return {
      makerAmount: new BigNumber(amountOrder)
        .times(ratio)
        .times(new BigNumber(10).pow(18)).dp(0, BigNumber.ROUND_FLOOR),
      takerAmount: new BigNumber(amountOrder)
        .times(ratio)
        .times(priceOrder)
        .times(new BigNumber(10).pow(18)).dp(0, BigNumber.ROUND_FLOOR),
    };
  }
  return {
    makerAmount: new BigNumber(amountOrder)
      .times(ratio)
      .times(priceOrder)
      .times(new BigNumber(10).pow(18)).dp(0, BigNumber.ROUND_FLOOR),
    takerAmount: new BigNumber(amountOrder)
      .times(ratio)
      .times(new BigNumber(10).pow(18)).dp(0, BigNumber.ROUND_FLOOR),
  };
};

const buildBscOrder = (): LimitOrder => {
  return new LimitOrder({
    makerToken: TokenAddress.USDV,
    takerToken: TokenAddress.JPYV,
    ...getAmountByOrderSide(orderSideCreated),
    maker: walletOfMarketMaker.toLowerCase(),
    // fake
    taker: '0x0000000000000000000000000000000000000000',
    sender: matcherAddress,
    // @ts-ignore
    takerTokenFeeAmount: new BigNumber(orderSideCreated === OrderSide.Sell ? amountOrder : new BigNumber(amountOrder).times(priceOrder))
      .times(fees.limitOrderBsc)
      .times(
        new BigNumber(10).pow(18).dp(0, BigNumber.ROUND_FLOOR)
      ),
    feeRecipient: feeRecipientAddress,
    // fake
    pool: '0x0000000000000000000000000000000000000000000000000000000000000000',
    expiry: getExpiry(),
    salt: new BigNumber(hexUtils.random()),
    chainId: ENV.ChainId,
    verifyingContract: ENV.ExchangeFcxProxy,
  });
};

const getExpiry = (): BigNumber => {
  return new BigNumber(Math.floor(new Date(2100, 1, 1).getTime() / 1000));
};

const signOrder = async (order: LimitOrder): Promise<Signature> => {
  const signer = await order.getSignatureWithKey(ENV.PrivateKey, 2);
  return signer;
};

interface BscOrderType2 {
  maker_token: string;
  taker_token: string;
  maker_amounts: string;
  taker_amounts: string;
  price: string;
  amount?: string;
  total?: string;
  sender: string;
  maker: string;
  taker: string;
  taker_token_fee_amounts: string;
  fee_recipient: string;
  pool: string;
  expiry: string;
  salt: string;
  type: number;
  signature: string;
  pair_id: number;
  side: OrderSide;
  order_hash: string;
  method: number;
}

export const createBscOrderType2 = (
  limitOrder: LimitOrder,
  signature: Signature
): BscOrderType2 => {
  return {
    maker_token: limitOrder.makerToken,
    taker_token: limitOrder.takerToken,
    maker_amounts: limitOrder.makerAmount.toString(),
    taker_amounts: limitOrder.takerAmount.toString(),
    price: priceOrder,
    amount: amountOrder,
    sender: limitOrder.sender,
    maker: limitOrder.maker,
    // fake
    taker: limitOrder.taker,
    taker_token_fee_amounts: limitOrder.takerTokenFeeAmount.toString(),
    // fake
    fee_recipient: limitOrder.feeRecipient,
    // fake
    pool: limitOrder.pool,
    expiry: limitOrder.expiry.toString(),
    salt: limitOrder.salt.toString(),
    type: OrderType.LimitOrder, // Limit order: ;
    signature: JSON.stringify(signature),
    pair_id: OrderNameOfPairId.USDV_JPYV,
    side: orderSideCreated, // buy order: ;
    order_hash: limitOrder.getHash(),
    method: OrderMethod.BSC,
  };
};

const createBscOrder = async (): Promise<void> => {
  const bscOrder = buildBscOrder();
  console.log(bscOrder)
  const signature: Signature = await signOrder(bscOrder);
  const provider = new providers.JsonRpcProvider(ENV.JsonRpcProvider);

  const zeroEx = new Contract(ENV.ExchangeFcxProxy, zeroExABI, provider);

  const maker = new Wallet(ENV.PrivateKey, provider);

  const txHashTestOwner = await zeroEx
    .connect(maker)
    .createLimitOrder(JSON.parse(JSON.stringify(bscOrder)), signature, {
      gasLimit: 400000,
    });
  await txHashTestOwner.wait();
  const order = await createBscOrderType2(bscOrder, signature);
  console.log(order);
  axios
    .post(ENV.FcxCreateOrderApi, order, authHeaders)
    .then((res: any) => {
      if (res.data.data) {
        console.log(`Create Order Id: ${res.data.data.id} Success To Backend`);
      }
    })
    .catch((error: any) => {
      console.log(error.response.data, 'Error');
    });
};

function start(): void {
  createBscOrder();
  console.log(getAmountByOrderSide(OrderSide.Sell), 'Buy');
  console.log(getAmountByOrderSide(OrderSide.Buy), 'Sell');
}

start();

// taker: 2298850000000000000;
// maker: 7816090000000000000;

// { makerAmount: 2298850000000000000, takerAmount: 7816090000000000000 }
