'use server';
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import * as sql from 'mssql';
import { getPool } from '@/lib/db';
import { FilterOptionsOutputSchema, FilterOptionsOutput } from '@/lib/types';

// Whitelisted: these names are interpolated into SQL.
const FILTER_COLUMNS = ['MeraLocationId', 'MeraRevenueCenterName', 'MeraAreaId'] as const;

const filterOptionsFlow = ai.defineFlow(
  {
    name: 'filterOptionsFlow',
    inputSchema: z.object({}),
    outputSchema: FilterOptionsOutputSchema,
  },
  async () => {
    const options: FilterOptionsOutput['options'] = {};
    try {
      const pool = await getPool();
      for (const col of FILTER_COLUMNS) {
        const result = await new sql.Request(pool).query(
          `SELECT DISTINCT TOP 5000 [${col}] AS v FROM REP_usaSalesByRevenueCenter WHERE [${col}] IS NOT NULL ORDER BY [${col}]`
        );
        options[col] = result.recordset.map(r => r.v);
      }
    } catch (err: any) {
      console.error('Error in filterOptionsFlow:', err);
    }
    return { options };
  }
);

export async function getFilterOptions(): Promise<FilterOptionsOutput> {
  return await filterOptionsFlow({});
}
