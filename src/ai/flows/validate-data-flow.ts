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
import { parse, isValid } from 'date-fns';

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

      // Create a transformed row for validation
      const transformedRow: { [key: string]: any } = {};

      for (const sqlCol of tableColumns) {
         if (sqlCol.isIdentity) continue;
         const mappedExcelCol = columnMapping[sqlCol.name];
         transformedRow[sqlCol.name] = mappedExcelCol ? excelRow[mappedExcelCol] : undefined;
      }
      
      for (const sqlCol of tableColumns) {
        if (sqlCol.isIdentity) continue;

        const rawValue = transformedRow[sqlCol.name];
        
        // 1. Check for missing required values
        if (sqlCol.isRequired && (rawValue === undefined || rawValue === null || String(rawValue).trim() === '')) {
            errorDetails.push({
                row: excelRowNumber,
                column: sqlCol.name,
                value: String(rawValue ?? 'NULL'),
                error: `Required value is missing.`,
            });
            rowHasError = true;
            continue; 
        }

        // Skip validation for non-required empty values
        if (!sqlCol.isRequired && (rawValue === undefined || rawValue === null || String(rawValue).trim() === '')) {
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
                const cleanedValue = String(rawValue).replace(/[$,]/g, '');
                parsedValue = parseFloat(cleanedValue);
                if (isNaN(parsedValue)) {
                    errorDetails.push({ row: excelRowNumber, column: sqlCol.name, value: String(rawValue), error: 'Must be a valid number.' });
                    rowHasError = true;
                }
                break;
            case 'datetime':
                // Handle Excel's numeric date format
                if (typeof rawValue === 'number' && rawValue > 0) {
                    const date = new Date(Math.round((rawValue - 25569) * 86400 * 1000));
                     if (!isValid(date)) {
                        errorDetails.push({ row: excelRowNumber, column: sqlCol.name, value: String(rawValue), error: 'Invalid Excel date serial number.' });
                        rowHasError = true;
                    }
                } else { // Handle string dates
                    const dateStr = String(rawValue);
                    // Attempt to parse multiple formats, e.g. YYYY-MM-DD, MM/DD/YYYY
                    const supportedFormats = ['yyyy-MM-dd', 'MM/dd/yyyy', "yyyy-MM-dd'T'HH:mm:ss.SSSX", "yyyy-MM-dd HH:mm:ss"];
                    let parsedDate = null;
                    for(const format of supportedFormats) {
                        const d = parse(dateStr, format, new Date());
                        if (isValid(d)) {
                            parsedDate = d;
                            break;
                        }
                    }
                    if (!parsedDate) {
                        errorDetails.push({ row: excelRowNumber, column: sqlCol.name, value: dateStr, error: 'Invalid or unsupported date format.' });
                        rowHasError = true;
                    }
                }
                break;
            case 'varchar(100)':
                if(typeof rawValue !== 'string' && typeof rawValue !== 'number'){
                    errorDetails.push({ row: excelRowNumber, column: sqlCol.name, value: String(rawValue), error: 'Must be a valid string or number.' });
                    rowHasError = true;
                } else if (String(rawValue).length > 100) {
                     errorDetails.push({ row: excelRowNumber, column: sqlCol.name, value: `"${String(rawValue).substring(0, 20)}..."`, error: 'Exceeds max length of 100 characters.' });
                    rowHasError = true;
                }
                break;
        }
      }

      if (!rowHasError) {
        validRows++;
      }
    });
    
    return {
      totalRows: excelData.length,
      validRows: validRows,
      errors: Array.from(new Set(errorDetails.map(e => e.row))).length,
      skipped: 0, // Implement duplicate check logic here in the future
      errorDetails: errorDetails,
    };
  }
);


export async function validateData(input: ValidateDataInput): Promise<ValidateDataOutput> {
    return validateDataFlow(input);
}

    