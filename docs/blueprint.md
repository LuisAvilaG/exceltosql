# **App Name**: Excel SQL Loader

## Core Features:

- Excel Upload and Preview: Upload Excel files via drag & drop, select a sheet, and preview 50-200 rows. Temporary storage and automatic cleanup.
- Column Mapping UI: Auto-detect Excel headers and provide a UI with dropdowns to map Excel columns to SQL Server columns. Includes transformation options for date parsing, number cleaning, default values, and string trimming.
- Data Validation and Error Reporting: Validate data types (int/decimal/datetime) and required fields. Report errors per row with column and cause. Includes configurable required fields (SalesDate, MeraLocationId, MeraRevenueCenterId by default) and empty cell handling (null vs 0).
- Duplicate Handling Strategies: Implement strategies for duplicate handling: Insert Only, Skip Duplicates, or Upsert. Allow defining a configurable logical key for 'exists' checks (SalesDate + MeraLocationId + MeraRevenueCenterId + MeraOrderType by default).
- SQL Server Insertion: Insert data into the SQL Server table REP_usaSalesByRevenueCenter in configurable batch sizes (e.g., 1,000 / 5,000 / 10,000) with options for per-batch or single transaction. Includes a progress bar, ETA, and counts (total, inserted, skipped, with errors).
- Job History Logging: Save a 'Job History' with file name, date/time, user (if authenticated), duplicate strategy, result, and downloadable logs.
- Test Connection: Validate connection to SQL Server using credentials and other settings provided in environment variables

## Style Guidelines:

- Primary color: A muted blue (#6699CC) to represent data and stability.
- Background color: A very light blue (#F0F8FF) to provide a clean and calm working environment.
- Accent color: A gentle green (#90EE90) to highlight successful operations and key actions.
- Body and headline font: 'Inter', a grotesque-style sans-serif font, will be used for a modern, machined, objective, and neutral feel.
- Use simple, clear icons to represent different data operations and statuses.
- A three-step layout (Upload -> Mapping -> Run) ensures a straightforward process for the user.
- Use a progress bar with smooth transitions during the SQL Server insertion process.