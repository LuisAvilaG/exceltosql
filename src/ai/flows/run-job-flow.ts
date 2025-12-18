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
    let transaction: sql.Transaction | null = null;

    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    try {
      pool = await sql.connect(config);
      

      if (settings.deleteAll) {
        const deleteRequest = new sql.Request(pool);
        await deleteRequest.query(`TRUNCATE TABLE ${settings.tableName}`);
      }

      const mappedCols = tableColumns.filter(c => !c.isIdentity && settings.columnMapping[c.name]);
      
      // For insert_only, we can use a much faster bulk insert
      if (settings.duplicateStrategy === 'insert_only' && data.length > 0) {
          const table = new sql.Table(settings.tableName);
          table.create = false; // We're not creating the table
          
          // Add column definitions to the TVP
          mappedCols.forEach(col => {
              const sqlType = getSqlType(col.type);
              if (sqlType) {
                  table.columns.add(col.name, sqlType);
              }
          });

          // Add rows
          data.forEach(row => {
              const values = mappedCols.map(col => {
                  let val = row[col.name];
                  // Handle potential type issues from JSON
                  if (col.type === 'datetime' && typeof val === 'string') {
                      return new Date(val);
                  }
                  // mssql bulk can handle nulls and other primitives directly
                  return val;
              });
              table.rows.add(...values);
          });
          
          const bulkRequest = new sql.Request(pool);
          const result = await bulkRequest.bulk(table);
          insertedCount += result.rowsAffected;

      } else {
        // Fallback or other strategies (skip/upsert)
        // This will be slower.
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        for (const row of data) {
           try {
              // TODO: Implement row-by-row upsert/skip logic
              // For this example, we'll just simulate it as an insert.
              
              const columns = mappedCols.map(c => `[${c.name}]`).join(', ');
              const values = mappedCols.map((c, i) => `@param${i}`).join(', ');
              let query = `INSERT INTO ${settings.tableName} (${columns}) VALUES (${values});`;
              
              const rowRequest = new sql.Request(transaction);
              mappedCols.forEach((col, i) => {
                  const val = row[col.name];
                  rowRequest.input(`param${i}`, val);
              });
              
              await rowRequest.query(query);
              insertedCount++;

           } catch (rowErr: any) {
              errorCount++;
              if (settings.strictMode === 'strict') throw rowErr;
           }
        }

        await transaction.commit();
      }
      
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

export async function runJob(input: RunJobInput): Promise<RunJobOutput> {
  return await runJobFlow(input);
}
