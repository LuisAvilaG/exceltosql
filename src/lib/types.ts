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

export type ValidateDataOutput = {
  totalRows: number;
  validRows: number;

  errors: number;
  skipped: number;
  errorDetails: ErrorDetail[];
};
