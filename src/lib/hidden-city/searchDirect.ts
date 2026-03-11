import Logger from '@/utils/logger';

import { duffel } from './duffel';
import { DirectResult, SearchParams } from './types';

export async function searchDirect(
  params: SearchParams
): Promise<DirectResult | null> {
  Logger.info(`[SearchDirect] Querying Duffel API: ${params.origin} -> ${params.destination}`);

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
  Logger.info(`[SearchDirect] Received ${offers?.length ?? 0} offers from Duffel`);

  if (!offers || offers.length === 0) {
    Logger.warning(`[SearchDirect] No direct offers found for ${params.origin} -> ${params.destination}`);
    return null;
  }

  const cheapest = [...offers].sort(
    (a, b) => parseFloat(a.total_amount) - parseFloat(b.total_amount)
  )[0];

  Logger.info(`[SearchDirect] Cheapest direct: ${cheapest.total_amount} ${cheapest.total_currency} (${cheapest.owner.name})`);

  return {
    cheapest_price: cheapest.total_amount,
    currency: cheapest.total_currency,
    airline: cheapest.owner.name,
  };
}
