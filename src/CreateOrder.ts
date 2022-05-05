import {BigNumber, hexUtils} from '@0x/utils';
import {LimitOrder, Signature} from '@0x/protocol-utils';
import {zeroExABI} from "./zeroExABI";
import { providers, Contract, Wallet } from 'ethers'
const axios = require('axios').default;

const buildBscOrder = (
): LimitOrder => {
  return new LimitOrder({
    makerToken: '0x6a422957767e65144Fe05941A984cF6b736e7C8B',
    takerToken: '0x07f936b6Ee10843de79C57184aE0D5cc4B3a3F8C',
    makerAmount: new BigNumber('999500000000000000'),
    takerAmount: new BigNumber('999500000000000000'),
    maker: '0x3f4bBdece2854C034255854Faa3A3Fb632cB309D',
    // fake
    taker: '0x0000000000000000000000000000000000000000',
    sender: '0x3b5FE29c29F50e6ca1086b163039935d712344E6',
    takerTokenFeeAmount: new BigNumber('500000000000000'),
    feeRecipient: '0x3b5FE29c29F50e6ca1086b163039935d712344E6',
    // fake
    pool: '0x0000000000000000000000000000000000000000000000000000000000000000',
    expiry: getExpiry(),
    salt: new BigNumber(hexUtils.random()),
    chainId: 97,
    verifyingContract: '0x671bA355d51a1B58c0634F949ff512baAD994965',
  });
};

const getExpiry = (): BigNumber => {
    return new BigNumber(Math.floor(new Date(2100, 1, 1).getTime() / 1000));
};

const signOrder = async (order: LimitOrder): Promise<Signature> => {
  const signer = await order.getSignatureWithKey('0x605219f36b986e2a270ef0f779beeedf4a2055b95d3df9044998c829b978c213', 2);
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
  side: 1 | 2;
  order_hash: string;
  method: number;
}

export const createBscOrderType2 = (
  limitOrder: LimitOrder,
  signature: Signature,
): BscOrderType2 => {
  return {
    maker_token: limitOrder.makerToken,
    taker_token: limitOrder.takerToken,
    maker_amounts: limitOrder.makerAmount.toString(),
    taker_amounts: limitOrder.takerAmount.toString(),
    price: "1",
    amount: "1",
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
    type: 1, // Limit order
    signature: JSON.stringify(signature),
    pair_id: 1,
    side: 1, // buy order
    order_hash: limitOrder.getHash(),
    method: 2,
  };
};

let authHeaders = {
  headers: {
    Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjkwLCJpYXQiOjE2NTE3NjQyOTcsImV4cCI6MTY1MTc2NDg5N30.TAPqQSbJAVX2dQvYPbh7SD1cO4VGxrGop8frw_TV_VY`,
  },
};


const createOrder = async (): Promise<void> => {
  const bscOrder = buildBscOrder();
  const signature: Signature = await signOrder(bscOrder);
  const provider = new providers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545');

  const zeroEx = new Contract(
    '0x671bA355d51a1B58c0634F949ff512baAD994965',
    zeroExABI,
    provider
  );

  const maker = new Wallet('0x605219f36b986e2a270ef0f779beeedf4a2055b95d3df9044998c829b978c213', provider);

  const txHashTestOwner = await zeroEx
    .connect(maker)
    .createLimitOrder
    (
      JSON.parse(JSON.stringify(bscOrder)),
      signature,
      { gasLimit: 400000}
    );
  await txHashTestOwner.wait();
  const order = await createBscOrderType2(bscOrder, signature);
  axios.post('https://api.fcx-staging.velo.org/api/v1/order', order, authHeaders)
    .then((res: any) => {
      if (res.data.data) {
        console.log('Create Order Success To Backend')
      }
    })
    .catch((error: any) => {
      console.log(error, 'Error');
    });
}

function start(): void {
  createOrder();
}

start();

