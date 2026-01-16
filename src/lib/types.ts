
import { z } from 'zod';

export type ExcelData = { [key: string]: any };

export type ColumnMapping = {
  [key: string]: string | null; // Maps SQL column name to Excel header name
};

export type RunSettings = {
  duplicateStrategy: 'insert_only' | 'skip' | 'upsert';
  strictMode: boolean;
  batchSize: number;
};

export type SqlColumn = {
  name: string;
  type: string;
  isIdentity: boolean;
  isRequired: boolean;
  description: string;
};

export type ErrorDetail = {
    row: number;
    column: string;
    value: string;
    error: string;
};

export type JobResult = {
  totalRows: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
  errorDetails: ErrorDetail[];
}

export type ValidateDataOutput = {
  totalRows: number;
  validRows: number;
  errors: number;
  skipped: number;
  errorDetails: ErrorDetail[];
};


// Schemas moved from run-job-flow.ts
const RunJobSettingsSchema = z.object({
  tableName: z.string(),
  columnMapping: z.record(z.string(), z.string().nullable()),
  duplicateStrategy: z.enum(['insert_only', 'skip', 'upsert']),
  strictMode: z.enum(['tolerant', 'strict']),
  batchSize: z.number().int().positive(),
  deleteAll: z.boolean(),
  primaryKey: z.string().optional(),
});

export const RunJobInputSchema = z.object({
  data: z.array(z.record(z.any())),
  settings: RunJobSettingsSchema,
});
export type RunJobInput = z.infer<typeof RunJobInputSchema>;

export const RunJobOutputSchema = z.object({
  success: z.boolean(),
  inserted: z.number(),
  updated: z.number(),
  skipped: z.number(),
  errorCount: z.number(),
  errorDetails: z.array(z.object({
    row: z.number(),
    column: z.string(),
    value: z.any(),
    error: z.string(),
  })).optional(),
});
export type RunJobOutput = z.infer<typeof RunJobOutputSchema>;

export type DataContextType = {
  step: number;
  setStep: (step: number) => void;
  excelData: ExcelData[];
  setExcelData: (data: ExcelData[]) => void;
  excelHeaders: string[];
  setExcelHeaders: (headers: string[]) => void;
  fileName: string;
  setFileName: (name: string) => void;
  columnMapping: ColumnMapping;
  setColumnMapping: (mapping: ColumnMapping | ((prev: ColumnMapping) => ColumnMapping)) => void;
  validRows: ExcelData[];
  setValidRows: (rows: ExcelData[]) => void;
  jobResult: JobResult | null;
  setJobResult: (result: JobResult | null) => void;
  isDryRun: boolean;
  setIsDryRun: (isDryRun: boolean) => void;
  resetData: () => void;
};
