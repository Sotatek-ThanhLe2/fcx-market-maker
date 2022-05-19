/* eslint-disable camelcase */
/* eslint-disable prefer-const */
/* eslint-disable import/first */
const axios = require('axios').default;
import {
  Account,
  Asset,
  FeeBumpTransaction,
  Keypair,
  Operation,
  Server,
  Transaction,
  TransactionBuilder,
} from 'stellar-sdk';
import BigNumber from 'bignumber.js';

enum OrderSide {
  Buy = 1,
  Sell = 2,
}

enum OrderMethod {
  STELLAR = 1,
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
  PrivateKey: 'SBAZF22EEHZTMO5GETMRX6WWQ7JG6HM6KDU2DLRRVT72CN5ZXMSYNW22',
  FcxCreateOrderApi: 'https://api.fcx-staging.velo.org/api/v1/order',
  JsonRpcProvider: 'https://data-seed-prebsc-1-s1.binance.org:8545',
  ChainId: 97,
  STELLAR_EXCHANGE_ACCOUNT:
    'GCXUFEUJDNR7NULOCUX4WAOYN4SQNPULDROMMKKQVHBUF5HLFCXKNGPL',
};

// get fee in database
const fees = {
  limitOrderBsc: '0.0005',
  marketOrderBsc: '0.0035',
  limitOrderStellar: '0.008',
  marketOrderStellar: '0.03',
};

const getStellarOfferId = async (
  responseData: any
): Promise<string | undefined> => {
  if (responseData.offerResults[0]?.currentOffer) {
    return responseData.offerResults[0].currentOffer.offerId;
  } else if (responseData.offerResults[0].offersClaimed.length) {
    const offerClaimedId =
      responseData.offerResults[0].offersClaimed[0].offerId;
    return await axios
      // TODO: get next data if not found trade
      .get(`${STELLAR_HORIZON}trades?offer_id=${offerClaimedId}&limit=200`)
      .then((res: any) => {
        const record = res.data._embedded.records.find((d: any) => {
          return (
            d.ledger_close_time === responseData.created_at &&
            (d.counter_offer_id === offerClaimedId ||
              d.base_offer_id === offerClaimedId)
          );
        });
        // if (record.offer_id === record.base_offer_id) {
        if (offerClaimedId === record.base_offer_id) {
          return record.counter_offer_id;
          // } else if (record.offer_id === record.counter_offer_id) {
        } else if (offerClaimedId === record.counter_offer_id) {
          return record.base_offer_id;
        } else {
          return undefined;
        }
      })
      .catch((e: any) => e);
  }
  return undefined;
};

const stellarTxTimeout = 60;
const STELLAR_DECIMAL = 7;

enum STELLAR_ASSET_TYPE {
  NATIVE = 1,
  CREDIT_ALPHANUM4 = 2,
  CREDIT_ALPHANUM12 = 3,
}

const STELLAR_HORIZON = 'https://horizon-testnet.stellar.org/';
const server = new Server(`${STELLAR_HORIZON}`);
const networkPassphrase = 'Test SDF Network ; September 2015';
const offerIdForNewOffer = '0';

export const getAsset = (
  symbol: string,
  issuer: string,
  type: number
): Asset => {
  return type === STELLAR_ASSET_TYPE.NATIVE
    ? Asset.native()
    : new Asset(symbol, issuer);
};

export const buildTxCreateBuyOffer = async (
  amount: number | string | BigNumber,
  price: number | string | BigNumber,
  baseAsset: Asset,
  targetAsset: Asset,
  sourceAccount: Account,
  offerId = '0',
  exchangeFeeRate = '0'
): Promise<Transaction> => {
  const fee = (await server.fetchBaseFee()).toString();

  // with fee
  if (new BigNumber(exchangeFeeRate).gt('0')) {
    return new TransactionBuilder(sourceAccount, {
      fee,
      networkPassphrase,
    })
      .addOperation(
        Operation.manageBuyOffer({
          buying: baseAsset,
          selling: targetAsset,
          buyAmount: new BigNumber(amount)
            .times(new BigNumber(1).minus(exchangeFeeRate))
            .dp(STELLAR_DECIMAL, BigNumber.ROUND_DOWN)
            .toString(),
          price: new BigNumber(price).dp(STELLAR_DECIMAL, BigNumber.ROUND_UP),
          offerId,
        })
      )
      .addOperation(
        Operation.payment({
          destination: `${ENV.STELLAR_EXCHANGE_ACCOUNT}`,
          asset: targetAsset,
          amount: new BigNumber(amount)
            .times(price)
            .times(exchangeFeeRate)
            .dp(STELLAR_DECIMAL, BigNumber.ROUND_DOWN)
            .toString(),
        })
      )
      .setTimeout(stellarTxTimeout)
      .build();
  }

  // without fee
  return new TransactionBuilder(sourceAccount, {
    fee,
    networkPassphrase,
  })
    .addOperation(
      Operation.manageBuyOffer({
        buying: baseAsset,
        selling: targetAsset,
        buyAmount: new BigNumber(amount)
          .dp(STELLAR_DECIMAL, BigNumber.ROUND_DOWN)
          .toString(),
        price: new BigNumber(price).dp(STELLAR_DECIMAL, BigNumber.ROUND_UP),
        offerId,
      })
    )
    .setTimeout(stellarTxTimeout)
    .build();
};

export const buildTxCreateSellOffer = async (
  amount: number | string | BigNumber,
  price: number | string | BigNumber,
  baseAsset: Asset,
  targetAsset: Asset,
  sourceAccount: Account,
  offerId = '0',
  exchangeFeeRate = '0'
): Promise<Transaction> => {
  const fee = (await server.fetchBaseFee()).toString();

  // with fee
  if (new BigNumber(exchangeFeeRate).gt('0')) {
    return new TransactionBuilder(sourceAccount, {
      fee,
      networkPassphrase,
    })
      .addOperation(
        Operation.manageSellOffer({
          selling: baseAsset,
          buying: targetAsset,
          amount: new BigNumber(amount)
            .times(new BigNumber(1).minus(exchangeFeeRate))
            .dp(STELLAR_DECIMAL, BigNumber.ROUND_DOWN)
            .toString(),
          price: new BigNumber(price).dp(STELLAR_DECIMAL, BigNumber.ROUND_DOWN),
          offerId,
        })
      )
      .addOperation(
        Operation.payment({
          destination: `${ENV.STELLAR_EXCHANGE_ACCOUNT}`,
          asset: baseAsset,
          amount: new BigNumber(amount)
            .times(exchangeFeeRate)
            .dp(STELLAR_DECIMAL, BigNumber.ROUND_DOWN)
            .toString(),
        })
      )
      .setTimeout(stellarTxTimeout)
      .build();
  }

  // without fee
  return new TransactionBuilder(sourceAccount, {
    fee,
    networkPassphrase,
  })
    .addOperation(
      Operation.manageSellOffer({
        selling: baseAsset,
        buying: targetAsset,
        amount: new BigNumber(amount)
          .dp(STELLAR_DECIMAL, BigNumber.ROUND_DOWN)
          .toString(),
        price: new BigNumber(price).dp(STELLAR_DECIMAL, BigNumber.ROUND_DOWN),
        offerId,
      })
    )
    .setTimeout(stellarTxTimeout)
    .build();
};

const buyOffer = async (
  amount: number | string | BigNumber,
  price: number | string | BigNumber,
  baseAsset: Asset,
  targetAsset: Asset,
  keyPair: Keypair,
  exchangeFeeRate = '0'
) => {
  // TODO: catch exception when account is not active
  const account = await server.loadAccount(keyPair.publicKey());
  const sourceAccount = new Account(
    account.accountId(),
    account.sequenceNumber()
  );
  let transaction: Transaction | FeeBumpTransaction =
    await buildTxCreateBuyOffer(
      amount,
      price,
      baseAsset,
      targetAsset,
      sourceAccount,
      offerIdForNewOffer,
      exchangeFeeRate
    );

  // sign
  transaction.sign(keyPair);

  // submit
  try {
    return await server.submitTransaction(transaction);
  } catch (e) {
    throw (
      e.response.data.extras.result_codes.operations ||
      e.response.data.extras.result_codes.transaction
    );
    // return JSON.stringify(e.response, null, 2);
  }
};

const sellOffer = async (
  amount: number | string | BigNumber,
  price: number | string | BigNumber,
  baseAsset: Asset,
  targetAsset: Asset,
  keyPair: Keypair,
  exchangeFeeRate = '0'
) => {
  // TODO: catch exception when account is not active
  const account = await server.loadAccount(keyPair.publicKey());
  const sourceAccount = new Account(
    account.accountId(),
    account.sequenceNumber()
  );
  let transaction: Transaction | FeeBumpTransaction =
    await buildTxCreateSellOffer(
      amount,
      price,
      baseAsset,
      targetAsset,
      sourceAccount,
      offerIdForNewOffer,
      exchangeFeeRate
    );

  // sign
  transaction.sign(keyPair);

  // submit
  try {
    return await server.submitTransaction(transaction);
  } catch (e) {
    throw (
      e.response.data.extras.result_codes.operations ||
      e.response.data.extras.result_codes.transaction
    );
    // return JSON.stringify(e.response, null, 2);
  }
};

export const sendStellarOffer = async (
  orderSide: OrderSide,
  amount: number | string | BigNumber,
  price: number | string | BigNumber,
  selectedPair: {
    base_symbol: string;
    base_stellar_issuer: string;
    base_type: STELLAR_ASSET_TYPE;
    quote_symbol: string;
    quote_stellar_issuer: string;
    quote_type: STELLAR_ASSET_TYPE;
  },
  privateKey: string,
  exchangeFeeRate = '0',
  total = '0'
): Promise<any> => {
  const keyPair = Keypair.fromSecret(privateKey);

  if (!keyPair) return;

  const tradeByTotal = new BigNumber(total).gt(0);

  const baseAsset = getAsset(
    selectedPair.base_symbol,
    selectedPair.base_stellar_issuer,
    selectedPair.base_type
  );
  const targetAsset = getAsset(
    selectedPair.quote_symbol,
    selectedPair.quote_stellar_issuer,
    selectedPair.quote_type
  );

  if (orderSide === OrderSide.Buy) {
    if (tradeByTotal) {
      const revertedPrice = new BigNumber(1).div(price);
      return await sellOffer(
        total,
        revertedPrice,
        targetAsset,
        baseAsset,
        keyPair,
        exchangeFeeRate
      );
    } else {
      return await buyOffer(
        amount,
        price,
        baseAsset,
        targetAsset,
        keyPair,
        exchangeFeeRate
      );
    }
  } else if (orderSide === OrderSide.Sell) {
    if (tradeByTotal) {
      const revertedPrice = new BigNumber(1).div(price);
      return await buyOffer(
        total,
        revertedPrice,
        targetAsset,
        baseAsset,
        keyPair,
        exchangeFeeRate
      );
    } else {
      return await sellOffer(
        amount,
        price,
        baseAsset,
        targetAsset,
        keyPair,
        exchangeFeeRate
      );
    }
  }
};

interface StellarOrderType2 {
  price: string;
  amount?: string;
  total?: string;
  taker_token_fee_amounts: string;
  type: OrderType;
  pair_id: number;
  side: 1 | 2;
  method: OrderMethod;
  stellar_id: string | undefined;
  order_hash: string;
  maker: string;
}

const createStellarOfferType2 = (
  a: string | BigNumber,
  p: string | BigNumber,
  t: string | BigNumber,
  orderSide: OrderSide,
  selectedPair: {
    base_symbol: string;
    base_stellar_issuer: string;
    base_type: STELLAR_ASSET_TYPE;
    quote_symbol: string;
    quote_stellar_issuer: string;
    quote_type: STELLAR_ASSET_TYPE;
  },
  pairId: number,
  method: OrderMethod,
  type: OrderType,
  stellarTradingFee: string,
  orderHash: string,
  maker: string,
  stellarOfferId?: string
): StellarOrderType2 => {
  let feeAmount: BigNumber;
  const isUsingTotal = new BigNumber(t || '0').gt('0');
  if (orderSide === OrderSide.Buy) {
    if (isUsingTotal) {
      feeAmount = new BigNumber(t).times(stellarTradingFee);
    } else {
      feeAmount = new BigNumber(a).times(p).times(stellarTradingFee);
    }
  } else {
    if (isUsingTotal) {
      feeAmount = new BigNumber(t).div(p).times(stellarTradingFee);
    } else {
      feeAmount = new BigNumber(a).times(stellarTradingFee);
    }
  }
  return {
    price: new BigNumber(p).toString(),
    amount: isUsingTotal ? undefined : a.toString(),
    total: isUsingTotal ? t.toString() : undefined,
    // we use this field to save fee of both buy and sell order
    taker_token_fee_amounts: feeAmount
      .dp(STELLAR_DECIMAL, BigNumber.ROUND_DOWN)
      .toString(),
    type: type,
    pair_id: pairId,
    side: orderSide,
    method: method,
    stellar_id: stellarOfferId,
    order_hash: orderHash,
    maker,
  };
};

const priceOrder = '1';
const amountOrder = '0.5';
const orderSideCreated: OrderSide = OrderSide.Buy;
const issuer = 'GAXXMQMTDUQ4YEPXJMKFBGN3GETPJNEXEUHFCQJKGJDVI3XQCNBU3OZI';
const selectedPair = {
  base_symbol: 'USDV',
  base_stellar_issuer: issuer,
  base_type: STELLAR_ASSET_TYPE.CREDIT_ALPHANUM4,
  quote_symbol: 'JPYV',
  quote_stellar_issuer: issuer,
  quote_type: STELLAR_ASSET_TYPE.CREDIT_ALPHANUM4,
};
const pairId = OrderNameOfPairId.USDV_JPYV;

const createStellarOrder = async (): Promise<any> => {
  try {
    const responseData = await sendStellarOffer(
      OrderSide.Buy,
      amountOrder,
      priceOrder,
      selectedPair,
      ENV.PrivateKey,
      fees.limitOrderStellar
    );
    console.log(responseData);

    const method = OrderMethod.STELLAR;
    const stellarOfferId = await getStellarOfferId(responseData);

    const order = createStellarOfferType2(
      amountOrder,
      priceOrder,
      '0',
      orderSideCreated,
      selectedPair,
      pairId,
      method,
      OrderType.LimitOrder,
      fees.limitOrderStellar,
      responseData.hash,
      responseData.source_account,
      stellarOfferId
    );
    console.log(order);

    axios
      .post(ENV.FcxCreateOrderApi, order, authHeaders)
      .then((res: any) => {
        if (res.data.data) {
          console.log(
            `Create Order Id: ${res.data.data.id} Success To Backend`
          );
        }
      })
      .catch((error: any) => {
        console.log(error.response.data, 'Error');
      });
  } catch (e) {
    console.log(e);
  }
};

const start = () => {
  createStellarOrder();
};

start();
