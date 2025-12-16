export type ExcelData = { [key: string]: string | number | null }[];

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
