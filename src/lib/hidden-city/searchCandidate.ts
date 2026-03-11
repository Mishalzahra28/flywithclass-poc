import Logger from '@/utils/logger';

import { duffel } from './duffel';
import { CandidateCity, HiddenCityResult, SearchParams } from './types';

export async function searchCandidate(
  params: SearchParams,
  candidate: CandidateCity
): Promise<HiddenCityResult | null> {
  Logger.info(`[SearchCandidate] Searching: ${params.origin} -> ${candidate.code} (${candidate.name})`);

  try {
    const response = await duffel.offerRequests.create({
      slices: [
        {
          origin: params.origin,
          destination: candidate.code,
          departure_date: params.date,
          arrival_time: null,
          departure_time: null,
        },
      ],
      passengers: [{ type: 'adult' }],
      cabin_class: 'business',
      max_connections: 1,
      return_offers: true,
    });

    const offers = response.data.offers;
    Logger.info(`[SearchCandidate] ${candidate.code}: received ${offers?.length ?? 0} offers`);

    if (!offers || offers.length === 0) {
      Logger.info(`[SearchCandidate] ${candidate.code}: no offers found`);
      return null;
    }

    const hiddenCityOffers = offers.filter((offer) => {
      const segments = offer.slices[0]?.segments;
      if (!segments || segments.length < 2) {
        return false;
      }

      return segments[0].destination.iata_code === params.destination;
    });

    Logger.info(`[SearchCandidate] ${candidate.code}: ${hiddenCityOffers.length} offers connect through ${params.destination}`);

    if (hiddenCityOffers.length === 0) {
      Logger.info(`[SearchCandidate] ${candidate.code}: no hidden city offers (no connection at ${params.destination})`);
      return null;
    }

    const cheapest = [...hiddenCityOffers].sort(
      (a, b) => parseFloat(a.total_amount) - parseFloat(b.total_amount)
    )[0];

    Logger.info(`[SearchCandidate] ${candidate.code}: found hidden city offer at ${cheapest.total_amount} ${cheapest.total_currency}`);

    return {
      candidate_city: candidate.code,
      candidate_city_name: candidate.name,
      price: cheapest.total_amount,
      currency: cheapest.total_currency,
      airline: cheapest.owner.name,
      savings: '0',
      savings_percent: '0%',
      connection_at: params.destination,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    Logger.error(`[SearchCandidate] ${candidate.code}: search failed - ${message}`);
    return null;
  }
}
