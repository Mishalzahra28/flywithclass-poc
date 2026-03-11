import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { runHiddenCitySearch } from '@/lib/hidden-city/orchestrator';

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
  try {
    const searchParams = request.nextUrl.searchParams;

    const requiredParams = ['origin', 'destination', 'date'] as const;
    for (const key of requiredParams) {
      const value = searchParams.get(key);
      if (!value || value.trim().length === 0) {
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
      return NextResponse.json(
        {
          error: validation.error.issues[0]?.message ?? 'Invalid query parameters',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    const params = validation.data;
    if (params.origin === params.destination) {
      return NextResponse.json(
        {
          error: 'Origin and destination cannot be the same',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    const result = await runHiddenCitySearch(params);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: message,
        code: 'SEARCH_ERROR',
      },
      { status: 500 }
    );
  }
}
