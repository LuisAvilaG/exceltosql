'use server';
/**
 * @fileOverview A flow to test the database connection.
 *
 * - testDbConnection - A function that attempts to connect to the SQL Server database.
 * - TestDbConnectionOutput - The return type for the testDbConnection function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit/zod';
import * as sql from 'mssql';

const TestDbConnectionOutputSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});
export type TestDbConnectionOutput = z.infer<typeof TestDbConnectionOutputSchema>;

const testDbConnectionFlow = ai.defineFlow(
  {
    name: 'testDbConnectionFlow',
    inputSchema: z.void(),
    outputSchema: TestDbConnectionOutputSchema,
  },
  async () => {
    const config: sql.config = {
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      server: process.env.SQL_HOST || 'localhost',
      database: process.env.SQL_DATABASE,
      port: Number(process.env.SQL_PORT) || 1433,
      options: {
        encrypt: process.env.SQL_ENCRYPT === 'true', // Use true for Azure SQL Database, adjust as needed
        trustServerCertificate: process.env.SQL_TRUST_SERVER_CERTIFICATE === 'true', // Change to true for local dev / self-signed certs
      },
    };

    try {
      await sql.connect(config);
      await sql.close();
      return { success: true };
    } catch (err: any) {
      // Obscure detailed error messages for security
      let simpleError = 'Connection failed. Check credentials and network.';
      if (err.code === 'ELOGIN') {
        simpleError = 'Login failed. Please check your username and password.';
      } else if (err.code === 'ENOTFOUND' || err.code === 'ETIMEOUT') {
        simpleError = 'Cannot connect to server. Check host, port, and network access.';
      }
      return { success: false, error: simpleError };
    }
  }
);


export async function testDbConnection(): Promise<TestDbConnectionOutput> {
    return testDbConnectionFlow();
}
