'use server';
/**
 * @fileOverview A flow to validate Excel data against the SQL schema before import.
 *
 * - validateData - A function that validates each row of data.
 * - ValidateDataInput - The input type for the validateData function.
 * - ValidateDataOutput - The return type for the validateData function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { ExcelData, ColumnMapping, RunSettings } from '@/lib/types';
import { tableColumns } from '@/lib/schema';
import { parse } from 'date-fns';

// Input schema
const ValidateDataInputSchema = z.object({
  excelData: z.array(z.record(z.any())),
  columnMapping: z.record(z.string().nullable()),
  settings: z.object({
    duplicateStrategy: z.enum(['insert_only', 'skip', 'upsert']),
    strictMode: z.boolean(),
    batchSize: z.number(),
  }),
  isDryRun: z.boolean(),
});
export type ValidateDataInput = z.infer<typeof ValidateDataInputSchema>;

// Output schema
const ErrorDetailSchema = z.object({
    row: z.number(),
    column: z.string(),
    value: z.string(),
    error: z.string(),
});

const ValidateDataOutputSchema = z.object({
  totalRows: z.number(),
  validRows: z.number(),
  errors: z.number(),
  skipped: z.number(),
  errorDetails: z.array(ErrorDetailSchema),
});
export type ValidateDataOutput = z.infer<typeof ValidateDataOutputSchema>;


const validateDataFlow = ai.defineFlow(
  {
    name: 'validateDataFlow',
    inputSchema: ValidateDataInputSchema,
    outputSchema: ValidateDataOutputSchema,
  },
  async (input) => {
    const { excelData, columnMapping } = input;
    const errorDetails: z.infer<typeof ErrorDetailSchema>[] = [];
    let validRows = 0;

    excelData.forEach((excelRow, index) => {
      let rowHasError = false;
      const excelRowNumber = index + 2; // Excel rows are 1-based, plus header

      // Iterate over all possible SQL columns defined in the schema
      for (const sqlCol of tableColumns) {
        if (sqlCol.isIdentity) continue; // Skip identity columns like 'Id'

        const mappedExcelCol = columnMapping[sqlCol.name];
        const rawValue = mappedExcelCol ? excelRow[mappedExcelCol] : undefined;
        
        // 1. Check for missing required values
        if (sqlCol.isRequired && (rawValue === undefined || rawValue === null || rawValue === '')) {
            errorDetails.push({
                row: excelRowNumber,
                column: sqlCol.name,
                value: String(rawValue ?? 'NULL'),
                error: `Required value is missing.`,
            });
            rowHasError = true;
            continue; // Go to next column
        }

        // Skip validation for non-required empty values
        if (!sqlCol.isRequired && (rawValue === undefined || rawValue === null || rawValue === '')) {
            continue;
        }

        // 2. Type Validation
        let parsedValue: any = rawValue;
        
        switch(sqlCol.type) {
            case 'int':
                parsedValue = parseInt(String(rawValue), 10);
                if (isNaN(parsedValue)) {
                    errorDetails.push({ row: excelRowNumber, column: sqlCol.name, value: String(rawValue), error: 'Must be a valid integer.' });
                    rowHasError = true;
                }
                break;
            case 'decimal(38,0)':
            case 'decimal(10,0)':
                 // Remove common currency symbols and commas
                const cleanedValue = String(rawValue).replace(/[$,]/g, '');
                parsedValue = parseFloat(cleanedValue);
                if (isNaN(parsedValue)) {
                    errorDetails.push({ row: excelRowNumber, column: sqlCol.name, value: String(rawValue), error: 'Must be a valid number.' });
                    rowHasError = true;
                }
                break;
            case 'datetime':
                // Try to parse various common date formats
                const date = parse(String(rawValue), 'yyyy-MM-dd', new Date());
                if (isNaN(date.getTime())) {
                     errorDetails.push({ row: excelRowNumber, column: sqlCol.name, value: String(rawValue), error: 'Invalid date format. Expected YYYY-MM-DD.' });
                     rowHasError = true;
                }
                break;
            case 'varchar(100)':
                if(typeof rawValue !== 'string' && typeof rawValue !== 'number'){
                    errorDetails.push({ row: excelRowNumber, column: sqlCol.name, value: String(rawValue), error: 'Must be a valid string.' });
                    rowHasError = true;
                }
                break;
        }
      }

      if (!rowHasError) {
        validRows++;
      }
    });
    
    // In a real run, this is where you'd execute the DB logic.
    // For now, validRows will represent "inserted" for a dry run.
    
    return {
      totalRows: excelData.length,
      validRows: validRows,
      errors: errorDetails.length > 0 ? Array.from(new Set(errorDetails.map(e => e.row))).length : 0,
      skipped: 0, // Implement duplicate check logic here in the future
      errorDetails: errorDetails,
    };
  }
);


export async function validateData(input: ValidateDataInput): Promise<ValidateDataOutput> {
    return validateDataFlow(input);
}

    