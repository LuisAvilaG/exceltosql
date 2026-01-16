
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


// Schemas for run-job-flow.ts
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


// Schemas for view-data-flow.ts
export const ViewDataInputSchema = z.object({
    page: z.number().int().positive(),
    rowsPerPage: z.number().int().positive(),
    filters: z.record(z.string(), z.any()).optional(),
    dateRange: z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
    }).optional(),
    sortBy: z.string(),
    sortOrder: z.enum(['asc', 'desc']),
});
export type ViewDataInput = z.infer<typeof ViewDataInputSchema>;

export const ViewDataOutputSchema = z.object({
    rows: z.array(z.record(z.any())),
    totalCount: z.number().int(),
});
export type ViewDataOutput = z.infer<typeof ViewDataOutputSchema>;


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
  lastRunFingerprints: Set<string>;
  setLastRunFingerprints: (fingerprints: Set<string>) => void;
  resetData: () => void;
  viewMode: 'wizard' | 'viewer';
  setViewMode: (mode: 'wizard' | 'viewer') => void;
  showStandaloneViewer: () => void;
};
