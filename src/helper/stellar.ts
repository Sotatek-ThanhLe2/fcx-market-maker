export const getStellarOfferId = async (responseData: any): Promise<string | undefined> => {
  if (responseData.offerResults[0]?.currentOffer) {
    return responseData.offerResults[0].currentOffer.offerId;
  } else if (responseData.offerResults[0].offersClaimed.length) {
    const offerClaimedId = responseData.offerResults[0].offersClaimed[0].offerId;
    return await axios
      // TODO: get next data if not found trade
      .get(`${process.env.REACT_APP_HORIZON}trades?offer_id=${offerClaimedId}&limit=200`)
      .then((res) => {
        const record = res.data._embedded.records.find((d: any) => {
          return (
            d.ledger_close_time === responseData.created_at &&
            (d.counter_offer_id === offerClaimedId || d.base_offer_id === offerClaimedId)
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
      .catch((e) => e);
  }
  return undefined;
};