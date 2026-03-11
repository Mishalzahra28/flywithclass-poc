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

  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(batch.map((task) => task()));

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      }
    }

    if (i + batchSize < tasks.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

export async function runHiddenCitySearch(
  params: SearchParams
): Promise<HiddenCityResponse> {
  const startTime = Date.now();

  const directResult = await searchDirect(params);
  if (!directResult) {
    throw new Error(
      `No direct flights found for ${params.origin} -> ${params.destination}`
    );
  }

  const directPrice = parseFloat(directResult.cheapest_price);
  const candidates = getFilteredCandidates(params.origin, params.destination);

  const tasks = candidates.map(
    (candidate) => () => searchCandidate(params, candidate)
  );

  const rawResults = await batchedPromises<HiddenCityResult | null>(tasks, 5, 300);

  const hiddenCities = rawResults
    .filter((result): result is HiddenCityResult => result !== null)
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

  return {
    direct: directResult,
    hidden_cities: hiddenCities,
    candidates_checked: candidates.length,
    hidden_cities_found: hiddenCities.length,
    search_time_ms: Date.now() - startTime,
  };
}
