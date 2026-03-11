import { duffel } from './duffel';
import { DirectResult, SearchParams } from './types';

export async function searchDirect(
  params: SearchParams
): Promise<DirectResult | null> {
  const response = await duffel.offerRequests.create({
    slices: [
      {
        origin: params.origin,
        destination: params.destination,
        departure_date: params.date,
        arrival_time: null,
        departure_time: null,
      },
    ],
    passengers: [{ type: 'adult' }],
    cabin_class: 'business',
    max_connections: 0,
    return_offers: true,
  });

  const offers = response.data.offers;
  if (!offers || offers.length === 0) {
    return null;
  }

  const cheapest = [...offers].sort(
    (a, b) => parseFloat(a.total_amount) - parseFloat(b.total_amount)
  )[0];

  return {
    cheapest_price: cheapest.total_amount,
    currency: cheapest.total_currency,
    airline: cheapest.owner.name,
  };
}
