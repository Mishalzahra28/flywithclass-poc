import Logger from '@/utils/logger';

import { getFilteredCandidates } from './candidates';
import { searchCandidate } from './searchCandidate';
import { searchDirect } from './searchDirect';
import { HiddenCityResponse, HiddenCityResult, SearchParams } from './types';

async function batchedPromises<T>(
  tasks: Array<() => Promise<T>>,
  batchSize: number,
  delayMs: number
): Promise<T[]> {
  const results: T[] = [];
  const totalBatches = Math.ceil(tasks.length / batchSize);
  Logger.info(`[Orchestrator] Starting batched execution: ${tasks.length} tasks in ${totalBatches} batches`);

  for (let i = 0; i < tasks.length; i += batchSize) {
    const batchNumber = Math.floor(i / batchSize) + 1;
    const batch = tasks.slice(i, i + batchSize);
    Logger.info(`[Orchestrator] Processing batch ${batchNumber}/${totalBatches} (${batch.length} tasks)`);

    const batchResults = await Promise.allSettled(batch.map((task) => task()));

    let fulfilled = 0;
    let rejected = 0;
    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
        fulfilled++;
      } else {
        rejected++;
      }
    }
    Logger.info(`[Orchestrator] Batch ${batchNumber} complete: ${fulfilled} fulfilled, ${rejected} rejected`);

    if (i + batchSize < tasks.length) {
      Logger.info(`[Orchestrator] Waiting ${delayMs}ms before next batch...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  Logger.info(`[Orchestrator] All batches complete. Total results: ${results.length}`);
  return results;
}

export async function runHiddenCitySearch(
  params: SearchParams
): Promise<HiddenCityResponse> {
  const startTime = Date.now();
  Logger.info(`[Orchestrator] Starting search: ${params.origin} -> ${params.destination} on ${params.date}`);

  Logger.info('[Orchestrator] Searching for direct flights...');
  const directResult = await searchDirect(params);
  if (!directResult) {
    Logger.error(`[Orchestrator] No direct flights found for ${params.origin} -> ${params.destination}`);
    throw new Error(
      `No direct flights found for ${params.origin} -> ${params.destination}`
    );
  }

  const directPrice = parseFloat(directResult.cheapest_price);
  const cheapestOffer = directResult.offers[0];
  Logger.info(`[Orchestrator] Direct flight found: ${directResult.cheapest_price} ${directResult.currency} (${cheapestOffer.airline})`);
  Logger.info(`[Orchestrator] Total direct flight options: ${directResult.offers.length}`);

  const candidates = getFilteredCandidates(params.origin, params.destination);
  Logger.info(`[Orchestrator] Retrieved ${candidates.length} candidate cities to search`);

  const tasks = candidates.map(
    (candidate) => () => searchCandidate(params, candidate)
  );

  Logger.info('[Orchestrator] Starting candidate searches...');
  const rawResults = await batchedPromises<HiddenCityResult | null>(tasks, 5, 300);

  const validResults = rawResults.filter((result): result is HiddenCityResult => result !== null);
  Logger.info(`[Orchestrator] Found ${validResults.length} valid results from ${rawResults.length} searches`);

  const hiddenCities = validResults
    .filter((result) => parseFloat(result.price) < directPrice)
    .map((result) => {
      const candidatePrice = parseFloat(result.price);
      const savings = directPrice - candidatePrice;
      const savingsPercent = ((savings / directPrice) * 100).toFixed(1);

      return {
        ...result,
        savings: savings.toFixed(2),
        savings_percent: `${savingsPercent}%`,
      };
    })
    .sort((a, b) => parseFloat(b.savings) - parseFloat(a.savings));

  Logger.info(`[Orchestrator] Found ${hiddenCities.length} hidden city opportunities cheaper than direct`);

  const searchTimeMs = Date.now() - startTime;
  Logger.success(`[Orchestrator] Search completed in ${searchTimeMs}ms`);

  return {
    direct: directResult,
    hidden_cities: hiddenCities,
    candidates_checked: candidates.length,
    hidden_cities_found: hiddenCities.length,
    search_time_ms: searchTimeMs,
  };
}
