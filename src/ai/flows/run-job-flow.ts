'use server';
import { ai } from '@/ai/genkit';
import * as sql from 'mssql';
import { tableColumns } from '@/lib/schema';
import { RunJobInputSchema, RunJobOutputSchema, RunJobInput, RunJobOutput } from '@/lib/types';

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

// Simplified SQL type getter
function getSqlType(typeName: string): any {
    const typeMap: { [key: string]: any } = {
        'int': sql.Int,
        'datetime': sql.DateTime,
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
    let pool: sql.ConnectionPool | null = null;
    let totalInserted = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    let totalErrorCount = 0;
    const allErrorDetails: any[] = [];

    try {
      pool = await sql.connect(config);

      if (settings.deleteAll) {
        const deleteRequest = new sql.Request(pool);
        await deleteRequest.query(`TRUNCATE TABLE ${settings.tableName}`);
      }

      const mappedCols = tableColumns.filter(c => !c.isIdentity && settings.columnMapping[c.name]);
      const batchSize = settings.batchSize > 0 ? settings.batchSize : data.length;

      for (let i = 0; i < data.length; i += batchSize) {
          const chunk = data.slice(i, i + batchSize);
          const transaction = new sql.Transaction(pool);
          await transaction.begin();

          try {
            if (settings.duplicateStrategy === 'insert_only' && chunk.length > 0) {
                const table = new sql.Table(settings.tableName);
                table.create = false;

                mappedCols.forEach(col => {
                    const sqlType = getSqlType(col.type);
                    if (sqlType) {
                        table.columns.add(col.name, sqlType, { nullable: true });
                    }
                });
                
                chunk.forEach(row => {
                    const values = mappedCols.map(col => {
                        let val = row[col.name];
                         if (col.type === 'datetime' && typeof val === 'string') {
                            return new Date(val);
                        }
                        return val;
                    });
                    table.rows.add(...values);
                });

                const bulkRequest = new sql.Request(transaction);
                const result = await bulkRequest.bulk(table);
                totalInserted += result.rowsAffected;
            } else {
               // Fallback for row-by-row strategies (skip/upsert)
               // This logic remains to be implemented fully for those strategies.
               // For now, it will act like a slower insert.
               for (const row of chunk) {
                 try {
                    const columns = mappedCols.map(c => `[${c.name}]`).join(', ');
                    const values = mappedCols.map((c, idx) => `@param${idx}`).join(', ');
                    let query = `INSERT INTO ${settings.tableName} (${columns}) VALUES (${values});`;
                    
                    const rowRequest = new sql.Request(transaction);
                    mappedCols.forEach((col, idx) => {
                        const val = row[col.name];
                        rowRequest.input(`param${idx}`, val);
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
              totalErrorCount += chunk.length; 
              allErrorDetails.push({ row: i, column: 'Batch', value: 'N/A', error: (err as Error).message });
              if (settings.strictMode === 'strict') throw err;
          }
      }

      return { success: true, inserted: totalInserted, updated: totalUpdated, skipped: totalSkipped, errorCount: totalErrorCount, errorDetails: allErrorDetails };

    } catch (err: any) {
      return {
        success: false,
        inserted: totalInserted, updated: totalUpdated, skipped: totalSkipped,
        errorCount: data.length - totalInserted,
        errorDetails: [{ row: 0, column: 'Global', value: 'N/A', error: err.message }]
      };
    } finally {
        if (pool) {
            await pool.close();
        }
    }
  }
);

export async function runJob(input: RunJobInput): Promise<RunJobOutput> {
  return await runJobFlow(input);
}
