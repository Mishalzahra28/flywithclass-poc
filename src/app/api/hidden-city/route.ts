import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { runHiddenCitySearch } from '@/lib/hidden-city/orchestrator';
import Logger from '@/utils/logger';

function isValidFutureDate(value: string): boolean {
  const [yearRaw, monthRaw, dayRaw] = value.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);

  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  const sameDate =
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() + 1 === month &&
    parsed.getUTCDate() === day;

  if (!sameDate) {
    return false;
  }

  const now = new Date();
  const todayUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  );

  return parsed.getTime() > todayUtc;
}

const QuerySchema = z.object({
  origin: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .pipe(
      z
        .string()
        .regex(/^[A-Z]{3}$/, 'Origin must be a 3-letter uppercase IATA code')
    ),
  destination: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .pipe(
      z
        .string()
        .regex(
          /^[A-Z]{3}$/,
          'Destination must be a 3-letter uppercase IATA code'
        )
    ),
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .refine(isValidFutureDate, 'Date must be a valid future date'),
});

export async function GET(request: NextRequest) {
  Logger.info('[API] Hidden city search request received', request.nextUrl.searchParams.toString());

  try {
    const searchParams = request.nextUrl.searchParams;

    const requiredParams = ['origin', 'destination', 'date'] as const;
    for (const key of requiredParams) {
      const value = searchParams.get(key);
      if (!value || value.trim().length === 0) {
        Logger.warning('[API] Missing required parameter:', key);
        return NextResponse.json(
          {
            error: `Missing required parameter: ${key}`,
            code: 'VALIDATION_ERROR',
          },
          { status: 400 }
        );
      }
    }

    const rawParams = {
      origin: searchParams.get('origin') ?? '',
      destination: searchParams.get('destination') ?? '',
      date: searchParams.get('date') ?? '',
    };

    const validation = QuerySchema.safeParse(rawParams);
    if (!validation.success) {
      Logger.warning('[API] Validation failed:', validation.error.issues);
      return NextResponse.json(
        {
          error: validation.error.issues[0]?.message ?? 'Invalid query parameters',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    const params = validation.data;
    Logger.info('[API] Validated params:', params);

    if (params.origin === params.destination) {
      Logger.warning('[API] Origin and destination are the same:', params.origin);
      return NextResponse.json(
        {
          error: 'Origin and destination cannot be the same',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    Logger.info('[API] Starting hidden city search...');
    const result = await runHiddenCitySearch(params);
    Logger.success('[API] Search completed successfully', {
      candidatesChecked: result.candidates_checked,
      hiddenCitiesFound: result.hidden_cities_found,
      searchTimeMs: result.search_time_ms,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    Logger.error('[API] Search failed:', message);
    return NextResponse.json(
      {
        error: message,
        code: 'SEARCH_ERROR',
      },
      { status: 500 }
    );
  }
}
