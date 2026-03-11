import Logger from '@/utils/logger';

import { CandidateCity } from './types';

export const CANDIDATE_CITIES: CandidateCity[] = [
  { code: 'ATL', name: 'Atlanta' },
  { code: 'ORD', name: 'Chicago' },
  { code: 'DFW', name: 'Dallas' },
  { code: 'DEN', name: 'Denver' },
  { code: 'LAX', name: 'Los Angeles' },
  { code: 'SFO', name: 'San Francisco' },
  { code: 'MIA', name: 'Miami' },
  { code: 'IAH', name: 'Houston' },
  { code: 'CLT', name: 'Charlotte' },
  { code: 'BOS', name: 'Boston' },
  { code: 'YYZ', name: 'Toronto' },
  { code: 'YUL', name: 'Montreal' },
  { code: 'LHR', name: 'London' },
  { code: 'CDG', name: 'Paris' },
  { code: 'FRA', name: 'Frankfurt' },
  { code: 'AMS', name: 'Amsterdam' },
  { code: 'DXB', name: 'Dubai' },
  { code: 'DOH', name: 'Doha' },
  { code: 'IST', name: 'Istanbul' },
  { code: 'DUB', name: 'Dublin' },
  { code: 'MAD', name: 'Madrid' },
  { code: 'FCO', name: 'Rome' },
  { code: 'MUC', name: 'Munich' },
  { code: 'JFK', name: 'New York JFK' },
  { code: 'EWR', name: 'Newark' },
];

export function getFilteredCandidates(
  origin: string,
  destination: string
): CandidateCity[] {
  Logger.info(`[Candidates] Filtering candidates excluding ${origin} and ${destination}`);

  const filtered = CANDIDATE_CITIES.filter(
    (candidate) => candidate.code !== origin && candidate.code !== destination
  );

  Logger.info(`[Candidates] ${filtered.length} candidates available (excluded ${CANDIDATE_CITIES.length - filtered.length})`);

  return filtered;
}
