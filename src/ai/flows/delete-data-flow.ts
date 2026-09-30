'use server';
import { ai } from '@/ai/genkit';
import * as sql from 'mssql';
import { getPool, buildWhere } from '@/lib/db';
import { DeleteDataInputSchema, DeleteDataOutputSchema, DeleteDataInput, DeleteDataOutput } from '@/lib/types';

const deleteDataFlow = ai.defineFlow(
  {
    name: 'deleteDataFlow',
    inputSchema: DeleteDataInputSchema,
    outputSchema: DeleteDataOutputSchema,
  },
  async (input) => {
    let transaction: sql.Transaction | null = null;
    try {
      const pool = await getPool();
      transaction = new sql.Transaction(pool);
      await transaction.begin();
      const request = new sql.Request(transaction);

      let where: string;
      if (input.mode === 'ids') {
        const params = input.ids.map((id, i) => {
          request.input(`id${i}`, sql.Int, id);
          return `@id${i}`;
        });
        where = `WHERE [Id] IN (${params.join(', ')})`;
      } else {
        where = buildWhere(request, input);
        if (!where) {
          throw new Error('Refusing to delete by filter without any filter applied.');
        }
        const count = (await request.query(`SELECT COUNT(*) AS total FROM REP_usaSalesByRevenueCenter ${where}`)).recordset[0].total;
        if (count !== input.expectedCount) {
          throw new Error(`The data changed: ${count} rows match now, but ${input.expectedCount} were confirmed. Nothing was deleted.`);
        }
      }

      const result = await request.query(`DELETE FROM REP_usaSalesByRevenueCenter ${where}`);
      await transaction.commit();
      return { success: true, deleted: result.rowsAffected[0] ?? 0 };
    } catch (err: any) {
      if (transaction) {
        try { await transaction.rollback(); } catch { /* already rolled back or never started */ }
      }
      console.error('Error in deleteDataFlow:', err);
      return { success: false, deleted: 0, error: err.message };
    }
  }
);

export async function deleteData(input: DeleteDataInput): Promise<DeleteDataOutput> {
  return await deleteDataFlow(input);
}
