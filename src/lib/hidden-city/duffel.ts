import { Duffel } from '@duffel/api';

if (!process.env.DUFFEL_ACCESS_TOKEN) {
  throw new Error('DUFFEL_ACCESS_TOKEN environment variable is not set');
}

export const duffel = new Duffel({
  token: process.env.DUFFEL_ACCESS_TOKEN,
});
