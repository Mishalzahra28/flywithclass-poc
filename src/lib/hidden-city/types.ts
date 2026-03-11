export interface SearchParams {
  origin: string;
  destination: string;
  date: string;
}

export interface DirectOffer {
  price: string;
  currency: string;
  airline: string;
}

export interface DirectResult {
  cheapest_price: string;
  currency: string;
  offers: DirectOffer[];
}

export interface HiddenCityResult {
  candidate_city: string;
  candidate_city_name: string;
  price: string;
  currency: string;
  airline: string;
  savings: string;
  savings_percent: string;
  connection_at: string;
}

export interface HiddenCityResponse {
  direct: DirectResult;
  hidden_cities: HiddenCityResult[];
  candidates_checked: number;
  hidden_cities_found: number;
  search_time_ms: number;
}

export interface CandidateCity {
  code: string;
  name: string;
}
