
'use server';
import { ai } from '@/ai/genkit';
import * as sql from 'mssql';
import { tableColumns } from '@/lib/schema';
import { RunJobInputSchema, RunJobOutputSchema, RunJobInput, RunJobOutput } from '@/lib/types';

// Let SQL driver manage the connection pool
let pool: sql.ConnectionPool | null = null;

async function getPool(): Promise<sql.ConnectionPool> {
    if (pool) {
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
    return pool;
}

// Simplified SQL type getter
function getSqlType(typeName: string): any {
    const typeMap: { [key: string]: any } = {
        'int': sql.Int,
        'datetime': sql.Date, // Use sql.Date to force only the date part
        'varchar(100)': sql.NVarChar(100),
        'decimal(38,0)': sql.Decimal(38, 0),
        'decimal(10,0)': sql.Decimal(10, 0),
    };
    const key = Object.keys(typeMap).find(k => typeName.startsWith(k.split('(')[0]));
    return key ? typeMap[key] : null;
}

const runJobFlow = ai.defineFlow(
  {
    name: 'runJobFlow',
    inputSchema: RunJobInputSchema,
    outputSchema: RunJobOutputSchema,
  },
  async ({ data, settings }) => {
    let totalInserted = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    let totalErrorCount = 0;
    const allErrorDetails: any[] = [];

    if (!data || data.length === 0) {
      return { success: true, inserted: 0, updated: 0, skipped: 0, errorCount: 0, errorDetails: [] };
    }

    try {
      const pool = await getPool();

      if (settings.deleteAll) {
        const deleteRequest = new sql.Request(pool);
        await deleteRequest.query(`TRUNCATE TABLE ${settings.tableName}`);
      }
      
      const mappedCols = tableColumns.filter(c => !c.isIdentity && settings.columnMapping[c.name]);
      const transaction = new sql.Transaction(pool);
      await transaction.begin();

      try {
        if (settings.duplicateStrategy === 'insert_only' && data.length > 0) {
            const table = new sql.Table(settings.tableName);
            table.create = false;

            mappedCols.forEach(col => {
                const sqlType = getSqlType(col.type);
                if (sqlType) {
                    table.columns.add(col.name, sqlType, { nullable: true });
                }
            });
            
            data.forEach(row => {
                const values = mappedCols.map(col => {
                    const val = row[col.name];
                    // The value is already a 'YYYY-MM-DD' string from the client, pass it directly.
                    // sql.Date type will handle the correct insertion.
                    return val;
                });
                table.rows.add(...values);
            });

            const bulkRequest = new sql.Request(transaction);
            const result = await bulkRequest.bulk(table);
            totalInserted += result.rowsAffected;

        } else {
           // Fallback for row-by-row strategies (skip/upsert)
           for (const row of data) {
             try {
                const columns = mappedCols.map(c => `[${c.name}]`).join(', ');
                const values = mappedCols.map((c, idx) => `@param${idx}`).join(', ');
                let query = `INSERT INTO ${settings.tableName} (${columns}) VALUES (${values});`;
                
                const rowRequest = new sql.Request(transaction);
                mappedCols.forEach((col, idx) => {
                    const val = row[col.name];
                    const sqlType = getSqlType(col.type);
                    rowRequest.input(`param${idx}`, sqlType, val);
                });
                
                await rowRequest.query(query);
                totalInserted++;
             } catch (rowErr: any) {
                totalErrorCount++;
                if (settings.strictMode === 'strict') throw rowErr;
             }
          }
        }
        await transaction.commit();
      } catch(err) {
          await transaction.rollback();
          totalErrorCount += data.length; 
          allErrorDetails.push({ row: 0, column: 'Batch', value: 'N/A', error: (err as Error).message });
          if (settings.strictMode === 'strict') throw err;
      }

      return { success: true, inserted: totalInserted, updated: totalUpdated, skipped: totalSkipped, errorCount: totalErrorCount, errorDetails: allErrorDetails };

    } catch (err: any) {
      return {
        success: false,
        inserted: totalInserted, updated: totalUpdated, skipped: totalSkipped,
        errorCount: data.length - totalInserted,
        errorDetails: [{ row: 0, column: 'Global', value: 'N/A', error: err.message }]
      };
    }
  }
);

export async function runJob(input: RunJobInput): Promise<RunJobOutput> {
  return await runJobFlow(input);
}
