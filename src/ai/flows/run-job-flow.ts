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

const runJobFlow = ai.defineFlow(
  {
    name: 'runJobFlow',
    inputSchema: RunJobInputSchema,
    outputSchema: RunJobOutputSchema,
  },
  async ({ data, settings }) => {
    let pool: sql.ConnectionPool | null = null;
    let transaction: sql.Transaction | null = null;

    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    try {
      pool = await sql.connect(config);
      transaction = new sql.Transaction(pool);
      await transaction.begin();

      const request = new sql.Request(transaction);

      if (settings.deleteAll) {
        await request.query(`TRUNCATE TABLE ${settings.tableName}`);
      }

      const mappedCols = tableColumns.filter(c => !c.isIdentity && settings.columnMapping[c.name]);
      
      for (let i = 0; i < data.length; i += settings.batchSize) {
        const batch = data.slice(i, i + settings.batchSize);
        
        // For insert_only, we can use a much faster bulk insert
        if (settings.duplicateStrategy === 'insert_only') {
            const table = new sql.Table(settings.tableName);
            table.create = false; // We're not creating the table
            
            // Add column definitions to the TVP
            mappedCols.forEach(col => {
                const sqlType = getSqlType(col.type);
                if (sqlType) {
                    // This is a bit of a hack, but mssql library requires length for some types
                    if (sqlType instanceof sql.VarChar || sqlType instanceof sql.NVarChar) {
                        table.columns.add(col.name, sqlType(100));
                    } else if (sqlType instanceof sql.Decimal) {
                         table.columns.add(col.name, sqlType(18, 2)); // Adjust precision as needed
                    } else {
                        table.columns.add(col.name, sqlType);
                    }
                }
            });

            // Add rows
            batch.forEach(row => {
                const values = mappedCols.map(col => {
                    let val = row[col.name];
                    // Handle potential type issues from JSON
                    if (col.type === 'datetime' && typeof val === 'string') {
                        return new Date(val);
                    }
                    return val;
                });
                table.rows.add(...values);
            });

            const bulkRequest = new sql.Request(transaction);
            const result = await bulkRequest.bulk(table);
            insertedCount += result.rowsAffected;

        } else {
          // For upsert or skip, we have to go row-by-row
          // This will be slower.
          for (const row of batch) {
             try {
                // TODO: Implement row-by-row upsert/skip logic
                // This is complex and requires checking for existing records.
                // For this example, we'll just simulate it as an insert.
                
                const columns = mappedCols.map(c => c.name).join(', ');
                const values = mappedCols.map((c, i) => `@param${i}`).join(', ');
                let query = `INSERT INTO ${settings.tableName} (${columns}) VALUES (${values});`;
                
                const rowRequest = new sql.Request(transaction);
                mappedCols.forEach((col, i) => {
                    const val = row[col.name];
                    const sqlType = getSqlType(col.type);
                    if (sqlType) {
                       rowRequest.input(`param${i}`, val);
                    }
                });
                
                await rowRequest.query(query);
                insertedCount++;

             } catch (rowErr: any) {
                errorCount++;
                if (settings.strictMode === 'strict') throw rowErr;
             }
          }
        }
      }

      await transaction.commit();
      
      return { success: true, inserted: insertedCount, updated: updatedCount, skipped: skippedCount, errorCount: errorCount };
    } catch (err: any) {
      if (transaction && !transaction.rolledBack) {
        await transaction.rollback();
      }
      return { 
        success: false, 
        inserted: insertedCount, updated: updatedCount, skipped: skippedCount, 
        errorCount: data.length - insertedCount,
        errorDetails: [{ row: 0, column: 'Transaction', value: 'N/A', error: err.message }]
      };
    } finally {
        if (pool) {
            await pool.close();
        }
    }
  }
);

function getSqlType(typeName: string): any {
    switch (typeName) {
        case 'int': return sql.Int;
        case 'datetime': return sql.DateTime;
        case 'varchar(100)': return sql.VarChar;
        case 'decimal(38,0)': return sql.Decimal;
        case 'decimal(10,0)': return sql.Decimal;
        default: return null;
    }
}


export async function runJob(input: RunJobInput): Promise<RunJobOutput> {
  return await runJobFlow(input);
}
