
'use server';
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import * as sql from 'mssql';
import { getPool, buildWhere } from '@/lib/db';
import { ViewDataInputSchema, ViewDataOutputSchema, ViewDataInput, ViewDataOutput } from '@/lib/types';

const viewDataFlow = ai.defineFlow(
  {
    name: 'viewDataFlow',
    inputSchema: ViewDataInputSchema,
    outputSchema: ViewDataOutputSchema,
  },
  async ({ page, rowsPerPage, filters, dateRange, sortBy, sortOrder }) => {
    try {
      const pool = await getPool();
      const request = new sql.Request(pool);

      const whereCondition = buildWhere(request, { filters, dateRange });

      // Query for total count
      const countQuery = `SELECT COUNT(*) as total FROM REP_usaSalesByRevenueCenter ${whereCondition}`;
      const countResult = await request.query(countQuery);
      const totalCount = countResult.recordset[0].total;

      // Query for paginated data
      const offset = (page - 1) * rowsPerPage;
      const safeSortBy = sortBy && /^[a-zA-Z0-9_]+$/.test(sortBy) ? `[${sortBy}]` : '[SalesDate]';
      const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';
      
      const dataQuery = `
        SELECT * 
        FROM REP_usaSalesByRevenueCenter
        ${whereCondition}
        ORDER BY ${safeSortBy} ${safeSortOrder}
        OFFSET ${offset} ROWS
        FETCH NEXT ${rowsPerPage} ROWS ONLY
      `;
      
      const dataResult = await request.query(dataQuery);
      
      // The mssql driver returns Date objects. Format them to 'yyyy-MM-dd' strings
      // to avoid client-side timezone issues and keep consistency.
      const formattedData = dataResult.recordset.map(row => {
          const newRow = {...row};
          if (newRow.SalesDate instanceof Date) {
              const d = newRow.SalesDate;
              // Add timezone offset to prevent date from shifting
              const correctedDate = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
              newRow.SalesDate = correctedDate.toISOString().split('T')[0];
          }
          return newRow;
      });

      return {
        rows: formattedData,
        totalCount,
      };

    } catch (err: any) {
      console.error("Error in viewDataFlow:", err);
      // In case of an error, return an empty result set.
      return {
        rows: [],
        totalCount: 0,
      };
    }
  }
);

export async function viewData(input: ViewDataInput): Promise<ViewDataOutput> {
    return await viewDataFlow(input);
}
