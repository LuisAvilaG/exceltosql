
'use server';
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import * as sql from 'mssql';
import { ViewDataInputSchema, ViewDataOutputSchema, ViewDataInput, ViewDataOutput } from '@/lib/types';

let pool: sql.ConnectionPool | null = null;

async function getPool(): Promise<sql.ConnectionPool> {
    if (pool && pool.connected) {
        return pool;
    }
    const config: sql.config = {
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      server: process.env.SQL_HOST || 'localhost',
      database: process.env.SQL_DATABASE,
      port: Number(process.env.SQL_PORT) || 1433,
      options: {
        encrypt: process.env.SQL_ENCRYPT === 'true',
        trustServerCertificate: process.env.SQL_TRUST_SERVER_CERTIFICATE === 'true',
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
      },
    };
    pool = await new sql.ConnectionPool(config).connect();
    pool.on('error', err => {
        console.error('SQL Pool Error', err);
        pool = null; // Reset pool on error
    });
    return pool;
}

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

      let whereClauses: string[] = [];
      let paramIndex = 0;

      // Handle standard column filters
      if (filters) {
          for (const [key, value] of Object.entries(filters)) {
              if (value !== undefined && value !== null && value !== '') {
                  const paramName = `param${paramIndex++}`;
                  whereClauses.push(`[${key}] LIKE @${paramName}`);
                  request.input(paramName, `%${value}%`);
              }
          }
      }

      // Handle date range filter
      if (dateRange) {
          if (dateRange.startDate) {
              const paramName = `param${paramIndex++}`;
              whereClauses.push(`[SalesDate] >= @${paramName}`);
              request.input(paramName, sql.Date, new Date(dateRange.startDate));
          }
          if (dateRange.endDate) {
              const paramName = `param${paramIndex++}`;
              whereClauses.push(`[SalesDate] <= @${paramName}`);
              request.input(paramName, sql.Date, new Date(dateRange.endDate));
          }
      }

      const whereCondition = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

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
