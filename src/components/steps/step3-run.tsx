
'use client';

import { useState, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Play, RefreshCw, Info, Trash2, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ExcelData, ErrorDetail, RunJobInput } from '@/lib/types';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { tableColumns, tableName } from '@/lib/schema';
import { parse, isValid, format } from 'date-fns';
import { runJob } from '@/ai/flows/run-job-flow';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useDataContext } from '@/context/data-context';

type RunStatus = 'configuring' | 'validating' | 'running' | 'finished';
type JobResult = {
  totalRows: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
  errorDetails: ErrorDetail[];
}

const VALIDATION_BATCH_SIZE = 500; 

export function Step3Run() {
  const { fileName, excelData, columnMapping, setStep, resetData } = useDataContext();
  const { toast } = useToast();
  const [status, setStatus] = useState<RunStatus>('configuring');
  
  const [progress, setProgress] = useState(0);
  const [errorDetails, setErrorDetails] = useState<ErrorDetail[]>([]);
  const [validRows, setValidRows] = useState<ExcelData[]>([]);
  const [jobResult, setJobResult] = useState<JobResult | null>(null);
  const [dryRunCompleted, setDryRunCompleted] = useState(false);
  const [isDryRun, setIsDryRun] = useState(false);

  const [duplicateStrategy, setDuplicateStrategy] = useState<'insert_only' | 'skip' | 'upsert'>('insert_only');
  const [strictMode, setStrictMode] = useState<'tolerant' | 'strict'>('tolerant');
  const [batchSize, setBatchSize] = useState('1000');
  const [deleteAll, setDeleteAll] = useState(false);
  const [primaryKey, setPrimaryKey] = useState('');
  
  const validateData = useCallback(async () => {
      setStatus('validating');
      let localErrors: ErrorDetail[] = [];
      let localValidRows: ExcelData[] = [];
      let processedCount = 0;

      const totalRows = excelData.length;

      for (let i = 0; i < totalRows; i += VALIDATION_BATCH_SIZE) {
          const batch = excelData.slice(i, i + VALIDATION_BATCH_SIZE);
          
          batch.forEach((excelRow, batchIndex) => {
              const originalIndex = i + batchIndex;
              const excelRowNumber = originalIndex + 2; 
              const transformedRow: { [key: string]: any } = {};
              let rowHasError = false;
              
              for (const sqlCol of tableColumns) {
                if (rowHasError) continue;
                if (sqlCol.isIdentity) continue;

                const mappedExcelCol = columnMapping[sqlCol.name];
                const rawValue = mappedExcelCol ? excelRow[mappedExcelCol] : undefined;
                let parsedValue: any = rawValue;
                
                if (rawValue === undefined || rawValue === null || String(rawValue).trim() === '') {
                  if (sqlCol.isRequired) {
                      localErrors.push({ row: excelRowNumber, column: sqlCol.name, value: String(rawValue ?? 'NULL'), error: `Required value is missing.` });
                      rowHasError = true;
                  } else {
                      if (sqlCol.name === 'MeraAreaId') {
                          parsedValue = null;
                      } else if (sqlCol.type.startsWith('decimal') || sqlCol.type === 'int') {
                          parsedValue = 0;
                      } else {
                          parsedValue = null;
                      }
                  }
                } else {
                    switch(sqlCol.type) {
                        case 'int':
                            parsedValue = parseInt(String(rawValue), 10);
                            if (isNaN(parsedValue)) {
                                localErrors.push({ row: excelRowNumber, column: sqlCol.name, value: String(rawValue), error: 'Must be a valid integer.' });
                                rowHasError = true;
                            }
                            break;
                        case 'decimal(38,0)':
                        case 'decimal(10,0)':
                            const cleanedValue = String(rawValue).replace(/[$,]/g, '');
                            parsedValue = parseFloat(cleanedValue);
                            if (isNaN(parsedValue)) {
                                localErrors.push({ row: excelRowNumber, column: sqlCol.name, value: String(rawValue), error: 'Must be a valid number.' });
                                rowHasError = true;
                            }
                            break;
                        case 'datetime':
                            const dateStr = String(rawValue).trim();
                            let finalDateStr: string | null = null;
                            
                            try {
                                if (dateStr.includes('/')) {
                                    const parts = dateStr.split(' ')[0].split('/');
                                    if (parts.length === 3) {
                                        const day = parts[0];
                                        const month = parts[1];
                                        const year = parts[2];
                                        if (parseInt(month, 10) > 12) {
                                             throw new Error(`Invalid month: ${month}`);
                                        }
                                        finalDateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                                    }
                                } else if (dateStr.includes('-')) {
                                    // Assumes YYYY-MM-DD format already
                                    const parsed = parse(dateStr.split(' ')[0], 'yyyy-MM-dd', new Date());
                                    if(isValid(parsed)) {
                                        finalDateStr = dateStr.split(' ')[0];
                                    }
                                }
                                
                                if (!finalDateStr || !isValid(parse(finalDateStr, 'yyyy-MM-dd', new Date()))) {
                                     throw new Error('Date is not in a recognized format (dd/MM/yyyy or yyyy-MM-dd).');
                                }
                                
                                parsedValue = finalDateStr;
                                console.log(`Row ${excelRowNumber}: Preparing SalesDate with value: ${parsedValue}`);

                            } catch (e: any) {
                                localErrors.push({ row: excelRowNumber, column: sqlCol.name, value: dateStr, error: e.message || 'Invalid or unsupported date format.' });
                                rowHasError = true;
                            }
                            break;
                        case 'varchar(100)':
                            parsedValue = String(rawValue);
                            if (parsedValue.length > 100) {
                                localErrors.push({ row: excelRowNumber, column: sqlCol.name, value: `"${parsedValue.substring(0, 20)}..."`, error: 'Exceeds max length of 100 characters.' });
                                rowHasError = true;
                            }
                            break;
                    }
                }
                if (!rowHasError) {
                    transformedRow[sqlCol.name] = parsedValue;
                }
              }

              if (!rowHasError) {
                localValidRows.push(transformedRow);
              }
          });
          
          processedCount += batch.length;
          setProgress(Math.round((processedCount / totalRows) * 100));
          await new Promise(resolve => setTimeout(resolve, 0));
      }

      setErrorDetails(localErrors);
      setValidRows(localValidRows);
      
      return { localErrors, localValidRows };
  }, [excelData, columnMapping]);


  const startJob = useCallback(async () => {
      if (validRows.length === 0 && !dryRunCompleted) {
          toast({ variant: "destructive", title: "No Data", description: "Please run a validation (Dry Run) first to prepare the data." });
          return;
      }
       if (validRows.length === 0 && dryRunCompleted) {
          toast({ variant: "destructive", title: "No Valid Data", description: "There are no valid rows to process after validation." });
          setStatus('finished');
          return;
      }
      
      setStatus('running');
      setProgress(0);
      setIsDryRun(false);
      
      const jobBatchSize = parseInt(batchSize, 10) || 1000;
      const totalRowsToProcess = validRows.length;
      const numBatches = Math.ceil(totalRowsToProcess / jobBatchSize);
      
      let totalInserted = 0;
      let totalUpdated = 0;
      let totalSkipped = 0;
      let totalErrorCount = 0;
      let allJobErrors: ErrorDetail[] = [];

      try {
        // First batch handles potential deletion
        if (numBatches > 0) {
            const firstBatch = validRows.slice(0, Math.min(jobBatchSize, totalRowsToProcess));
            const firstJobSettings: RunJobInput['settings'] = {
                tableName,
                columnMapping,
                duplicateStrategy,
                strictMode: strictMode as 'tolerant' | 'strict',
                batchSize: firstBatch.length,
                deleteAll: deleteAll, 
                primaryKey: (duplicateStrategy === 'skip' || duplicateStrategy === 'upsert') ? primaryKey : undefined,
            };

            const result = await runJob({ data: firstBatch, settings: firstJobSettings });

            if (result.success) {
                totalInserted += result.inserted;
                totalUpdated += result.updated;
                totalSkipped += result.skipped;
            }
            totalErrorCount += result.errorCount;
            if (result.errorDetails) {
                allJobErrors = [...allJobErrors, ...result.errorDetails];
            }
            setProgress(Math.round((1 / numBatches) * 100));

            if (!result.success && strictMode === 'strict') {
                throw new Error(result.errorDetails?.[0]?.error || "Job aborted due to an error in the first batch.");
            }
        }
        
        // Subsequent batches
        for (let i = 1; i < numBatches; i++) {
          const batchStart = i * jobBatchSize;
          const batchEnd = batchStart + jobBatchSize;
          const currentBatch = validRows.slice(batchStart, batchEnd);

          const jobSettings: RunJobInput['settings'] = {
              tableName,
              columnMapping,
              duplicateStrategy,
              strictMode: strictMode as 'tolerant' | 'strict',
              batchSize: currentBatch.length,
              deleteAll: false, // only first batch can delete
              primaryKey: (duplicateStrategy === 'skip' || duplicateStrategy === 'upsert') ? primaryKey : undefined,
          };
        
          const result = await runJob({ data: currentBatch, settings: jobSettings });
          
          if (result.success) {
             totalInserted += result.inserted;
             totalUpdated += result.updated;
             totalSkipped += result.skipped;
          }

          totalErrorCount += result.errorCount;
          if (result.errorDetails) {
            allJobErrors = [...allJobErrors, ...result.errorDetails];
          }

          setProgress(Math.round(((i + 1) / numBatches) * 100));

          if (!result.success && strictMode === 'strict') {
             throw new Error(result.errorDetails?.[0]?.error || "Job aborted due to an error in a subsequent batch.");
          }
        }
        
        setJobResult({
            totalRows: totalRowsToProcess,
            inserted: totalInserted,
            updated: totalUpdated,
            skipped: totalSkipped,
            errors: totalErrorCount,
            errorDetails: allJobErrors,
        });

        toast({
            title: "Job Complete",
            description: `Processed ${totalRowsToProcess} rows. Inserted: ${totalInserted}, Updated: ${totalUpdated}, Errors: ${totalErrorCount}`,
        });

      } catch (e: any) {
        const errorMessage = e.message || 'An unknown server error occurred.';
        setJobResult({
            totalRows: totalRowsToProcess,
            inserted: totalInserted,
            updated: totalUpdated,
            skipped: totalSkipped,
            errors: totalRowsToProcess - totalInserted - totalUpdated,
            errorDetails: [{ row: 0, column: 'Job', value: 'N/A', error: errorMessage }],
        });
         toast({
            variant: "destructive",
            title: "Job Failed",
            description: errorMessage,
        });
      } finally {
        setStatus('finished');
      }

  }, [validRows, toast, columnMapping, duplicateStrategy, strictMode, batchSize, deleteAll, primaryKey, dryRunCompleted]);


  const handleDryRun = async () => {
    setIsDryRun(true);

    if ( (duplicateStrategy === 'skip' || duplicateStrategy === 'upsert') && !primaryKey) {
        toast({
            variant: "destructive",
            title: "Configuration Error",
            description: "Please select a primary key for skip or upsert strategies.",
        });
        setIsDryRun(false);
        return;
    }

    toast({ title: "Starting validation...", description: `Processing ${excelData.length} rows.` });
    
    const { localErrors, localValidRows } = await validateData();

    setJobResult({
        totalRows: excelData.length,
        inserted: localValidRows.length, // Represents valid rows in a dry run
        updated: 0,
        skipped: 0, 
        errors: localErrors.length,
        errorDetails: localErrors,
    });
    setStatus('finished');
    setDryRunCompleted(true);
    toast({ title: "Validation Complete", description: `Found ${localValidRows.length} valid rows and ${localErrors.length} errors.` });
  };
  
  const handleNewJob = () => {
      resetData();
      setStep(1);
  }

  const renderContent = () => {
    switch (status) {
      case 'validating':
      case 'running':
        return (
          <div className="flex flex-col items-center justify-center gap-4 p-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="w-full text-center">
                <p className="text-muted-foreground">{status === 'validating' ? 'Validating data...' : 'Executing job...'}</p>
                <Progress value={progress} className="w-full mt-2" />
                <p className="text-sm text-muted-foreground mt-2">{progress}% complete</p>
            </div>
          </div>
        );
      case 'finished':
        return jobResult && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-6">
              <div className="p-4 bg-secondary rounded-lg">
                <p className="text-2xl font-bold">{jobResult.totalRows}</p>
                <p className="text-sm text-muted-foreground">Total Rows</p>
              </div>
              <div className="p-4 bg-secondary rounded-lg">
                <p className="text-2xl font-bold text-green-600">{dryRunCompleted && isDryRun ? jobResult.inserted : jobResult.inserted}</p>
                <p className="text-sm text-muted-foreground">{isDryRun ? 'Valid Rows' : 'Inserted'}</p>
              </div>
               <div className="p-4 bg-secondary rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{jobResult.updated}</p>
                <p className="text-sm text-muted-foreground">Updated</p>
              </div>
              <div className="p-4 bg-secondary rounded-lg">
                <p className="text-2xl font-bold text-destructive">{jobResult.errors}</p>
                <p className="text-sm text-muted-foreground">Rows with Errors</p>              </div>
            </div>
            {jobResult.errors > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Error Details (first 100 shown)</h3>
                <div className="h-60 overflow-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Row (Excel)</TableHead><TableHead>Column</TableHead><TableHead>Value</TableHead><TableHead>Error Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobResult.errorDetails.slice(0, 100).map((err, i) => (
                        <TableRow key={i}>
                          <TableCell>{err.row}</TableCell><TableCell>{err.column}</TableCell><TableCell><Badge variant="destructive" className="max-w-xs truncate">{String(err.value)}</Badge></TableCell><TableCell>{err.error}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        );
      case 'configuring':
      default:
        const showPkSelector = duplicateStrategy === 'skip' || duplicateStrategy === 'upsert';
        return (
            <div className="space-y-6">
                <div className="space-y-4 p-4 border rounded-lg bg-destructive/10 border-destructive">
                    <h3 className="font-semibold flex items-center gap-2"><Trash2 className="h-4 w-4" />Pre-Import Actions</h3>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="delete-all" checked={deleteAll} onCheckedChange={(checked) => setDeleteAll(!!checked)} />
                        <Label htmlFor="delete-all">Delete all existing data from the `{tableName}` table before import.</Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Warning: This action is irreversible and will permanently delete all data in the target table.
                    </p>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4 p-4 border rounded-lg">
                        <h3 className="font-semibold flex items-center gap-2"><Info className="h-4 w-4" />Duplicate Handling</h3>
                        <RadioGroup value={duplicateStrategy} onValueChange={v => setDuplicateStrategy(v as any)}>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="insert_only" id="r1" /><Label htmlFor="r1">Insert all (fastest, no duplicate check)</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="skip" id="r2" disabled /><Label htmlFor="r2" className="text-muted-foreground">Skip duplicates (coming soon)</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="upsert" id="r3" disabled /><Label htmlFor="r3" className="text-muted-foreground">Update if exists, insert if not (coming soon)</Label></div>
                        </RadioGroup>
                         {showPkSelector && (
                            <div className="pt-2">
                                <Label htmlFor="primary-key">Primary Key for Duplicates</Label>
                                <Select onValueChange={setPrimaryKey} value={primaryKey}>
                                    <SelectTrigger id="primary-key"><SelectValue placeholder="Select a key..." /></SelectTrigger>
                                    <SelectContent>
                                        {Object.keys(columnMapping).filter(k => columnMapping[k]).map(key => (
                                            <SelectItem key={key} value={key}>{key}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground mt-1">Select the column that uniquely identifies a row.</p>
                            </div>
                        )}
                    </div>
                    <div className="space-y-4 p-4 border rounded-lg">
                        <h3 className="font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Error Handling</h3>
                        <RadioGroup value={strictMode} onValueChange={v => setStrictMode(v as any)}>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="tolerant" id="r4" /><Label htmlFor="r4">Tolerant: Insert valid rows, report errors</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="strict" id="r5" /><Label htmlFor="r5">If one error occurs, abort the entire job</Label></div>
                        </RadioGroup>
                    </div>
                </div>
                <div>
                    <Label htmlFor="batch-size">Batch Size</Label>
                    <Input id="batch-size" type="number" value={batchSize} onChange={e => setBatchSize(e.target.value)} placeholder="e.g. 1000" />
                    <p className="text-xs text-muted-foreground">Number of rows to insert per database transaction. Max 1000 for bulk insert.</p>
                </div>
            </div>
        );
    }
  };

 const getTitle = () => {
    switch (status) {
        case 'validating': return 'Validating Data...';
        case 'running': return 'Running Job...';
        case 'finished': return isDryRun ? 'Validation Complete' : 'Job Complete';
        default: return 'Configuration and Execution';
    }
 };
 
 const getDescription = () => {
     switch (status) {
        case 'validating': return `Checking ${excelData.length} rows for errors before processing.`;
        case 'running': return `Inserting data into ${tableName}. This may take a moment.`;
        case 'finished': return `Results for the job on file ${fileName}.`;
        default: return 'Define the final details and start the data load to SQL Server.';
    }
 };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{getTitle()}</CardTitle>
        <CardDescription>{getDescription()}</CardDescription>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(2)} disabled={status === 'running' || status === 'validating'}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        
        {status === 'finished' ? (
             <div className="flex gap-2">
                <Button onClick={handleNewJob}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Start New Job
                </Button>
                {dryRunCompleted && (
                  <Button onClick={startJob} disabled={status === 'running' || status === 'validating' || validRows.length === 0} className="bg-green-600 text-white hover:bg-green-700">
                      {status === 'running' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                      Start Real Job
                  </Button>
                )}
            </div>
        ) : (
            <div className="flex gap-2">
                <Button variant="outline" onClick={handleDryRun} disabled={status === 'running' || status === 'validating'}>
                    {status === 'validating' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                    Validate (Dry Run)
                </Button>
                 <Button onClick={startJob} disabled={!dryRunCompleted || validRows.length === 0} className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Start Real Job
                </Button>
            </div>
        )}
      </CardFooter>
    </Card>
  );
}
