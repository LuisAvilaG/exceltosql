'use client';

import { useState, useEffect } from 'react';
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
import { ArrowLeft, Play, RefreshCw, Download, Info, Trash2, Loader2, CheckCircle } from 'lucide-react';
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
import type { ColumnMapping, RunSettings, ExcelData, ErrorDetail, ValidateDataOutput } from '@/lib/types';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { tableColumns } from '@/lib/schema';
import { parse, isValid } from 'date-fns';


interface Step3RunProps {
  fileName: string;
  excelData: ExcelData;
  columnMapping: ColumnMapping;
  runSettings: RunSettings;
  onBack: () => void;
  onNewJob: () => void;
}

type RunStatus = 'idle' | 'running' | 'finished' | 'configuring';

const BATCH_SIZE = 250; // Process 250 rows at a time

export function Step3Run({
  fileName,
  excelData,
  columnMapping,
  onBack,
  onNewJob,
}: Step3RunProps) {
  const { toast } = useToast();
  const [status, setStatus] = useState<RunStatus>('configuring');
  const [results, setResults] = useState<ValidateDataOutput | null>(null);
  const [isDryRun, setIsDryRun] = useState(false);
  
  // States for batch processing
  const [currentIndex, setCurrentIndex] = useState(0);
  const [errorDetails, setErrorDetails] = useState<ErrorDetail[]>([]);
  const [validRowCount, setValidRowCount] = useState(0);

  // Settings state
  const [duplicateStrategy, setDuplicateStrategy] = useState('insert_only');
  const [strictMode, setStrictMode] = useState('tolerant');
  const [batchSize, setBatchSize] = useState('1000');
  const [deleteAll, setDeleteAll] = useState(false);
  
  // This effect runs when the status is 'running'
  useEffect(() => {
    if (status !== 'running') return;

    if (currentIndex >= excelData.length) {
      // Finished processing all rows
      const finalResults: ValidateDataOutput = {
        totalRows: excelData.length,
        validRows: validRowCount,
        errors: Array.from(new Set(errorDetails.map(e => e.row))).length,
        skipped: 0, // This is a simulation, so no rows are actually skipped.
        errorDetails: errorDetails,
      };
      setResults(finalResults);
      setStatus('finished');
      toast({
        title: "Simulation Complete",
        description: `Found ${finalResults.errors} rows with errors.`,
      });
      return;
    }

    // Process the next batch
    const processBatch = () => {
      const end = Math.min(currentIndex + BATCH_SIZE, excelData.length);
      const batchData = excelData.slice(currentIndex, end);
      const batchErrors: ErrorDetail[] = [];
      let batchValidRows = 0;

      batchData.forEach((excelRow, batchIndex) => {
        let rowHasError = false;
        const originalIndex = currentIndex + batchIndex;
        const excelRowNumber = originalIndex + 2; // +1 for zero-index, +1 for header row

        const transformedRow: { [key: string]: any } = {};
        for (const sqlCol of tableColumns) {
          if (sqlCol.isIdentity) continue;
          const mappedExcelCol = columnMapping[sqlCol.name];
          transformedRow[sqlCol.name] = mappedExcelCol ? excelRow[mappedExcelCol] : undefined;
        }

        for (const sqlCol of tableColumns) {
          if (sqlCol.isIdentity) continue;
          
          const rawValue = transformedRow[sqlCol.name];

          // 1. Check for required values
          if (sqlCol.isRequired && (rawValue === undefined || rawValue === null || String(rawValue).trim() === '')) {
            batchErrors.push({ row: excelRowNumber, column: sqlCol.name, value: String(rawValue ?? 'NULL'), error: `Required value is missing.` });
            rowHasError = true;
            continue; // Skip further validation for this column
          }

          // If not required and empty, skip further validation
          if (!sqlCol.isRequired && (rawValue === undefined || rawValue === null || String(rawValue).trim() === '')) {
              continue;
          }
          
          let parsedValue: any = rawValue;
          switch(sqlCol.type) {
            case 'int':
                parsedValue = parseInt(String(rawValue), 10);
                if (isNaN(parsedValue)) {
                    batchErrors.push({ row: excelRowNumber, column: sqlCol.name, value: String(rawValue), error: 'Must be a valid integer.' });
                    rowHasError = true;
                }
                break;
            case 'decimal(38,0)':
            case 'decimal(10,0)':
                // Allow for currency symbols and commas
                const cleanedValue = String(rawValue).replace(/[$,]/g, '');
                parsedValue = parseFloat(cleanedValue);
                if (isNaN(parsedValue)) {
                    batchErrors.push({ row: excelRowNumber, column: sqlCol.name, value: String(rawValue), error: 'Must be a valid number.' });
                    rowHasError = true;
                }
                break;
            case 'datetime':
                if (typeof rawValue === 'number' && rawValue > 0) {
                    // It's likely an Excel date serial number.
                    // Excel serial date for 1900-01-01 is 1, but JS epoch is different. 25569 is the offset.
                    const date = new Date(Math.round((rawValue - 25569) * 86400 * 1000));
                     if (!isValid(date)) {
                        batchErrors.push({ row: excelRowNumber, column: sqlCol.name, value: String(rawValue), error: 'Invalid Excel date serial number.' });
                        rowHasError = true;
                    }
                } else {
                    const dateStr = String(rawValue);
                    // Try parsing multiple common date formats
                    const supportedFormats = ["yyyy-MM-dd'T'HH:mm:ss.SSSX", "yyyy-MM-dd HH:mm:ss", 'yyyy-MM-dd', 'MM/dd/yyyy'];
                    let parsedDate = null;
                    for(const format of supportedFormats) {
                        const d = parse(dateStr, format, new Date());
                        if (isValid(d)) {
                            parsedDate = d;
                            break;
                        }
                    }
                    if (!parsedDate) {
                        batchErrors.push({ row: excelRowNumber, column: sqlCol.name, value: dateStr, error: 'Invalid or unsupported date format.' });
                        rowHasError = true;
                    }
                }
                break;
            case 'varchar(100)':
                if(typeof rawValue !== 'string' && typeof rawValue !== 'number'){
                    batchErrors.push({ row: excelRowNumber, column: sqlCol.name, value: String(rawValue), error: 'Must be a valid string or number.' });
                    rowHasError = true;
                } else if (String(rawValue).length > 100) {
                     batchErrors.push({ row: excelRowNumber, column: sqlCol.name, value: `"${String(rawValue).substring(0, 20)}..."`, error: 'Exceeds max length of 100 characters.' });
                    rowHasError = true;
                }
                break;
          }
        }
        if (!rowHasError) {
          batchValidRows++;
        }
      });
      
      setErrorDetails(prev => [...prev, ...batchErrors]);
      setValidRowCount(prev => prev + batchValidRows);
      setCurrentIndex(end);
    };
    
    // Use a small timeout to allow the UI to update before processing the next batch
    const handle = setTimeout(processBatch, 0);
    return () => clearTimeout(handle);

  }, [status, currentIndex, excelData, columnMapping, validRowCount, errorDetails, toast]);


  const handleRun = (dryRun: boolean) => {
    setIsDryRun(dryRun);
    setStatus('running');
    // Reset previous results
    setResults(null);
    setCurrentIndex(0);
    setErrorDetails([]);
    setValidRowCount(0);
    
    toast({
      title: dryRun ? 'Starting simulation...' : 'Starting job...',
      description: `Validating ${excelData.length} rows from ${fileName}.`
    });
  };
  
  const handleDownload = (type: 'errors' | 'summary') => {
      toast({
          title: 'Function not implemented',
          description: `The ${type} report download is a simulation.`,
      });
  };

  const renderContent = () => {
    switch (status) {
      case 'running':
        const progress = Math.round((currentIndex / excelData.length) * 100);
        return (
          <div className="flex flex-col items-center justify-center gap-4 p-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="w-full text-center">
                <p className="text-muted-foreground">Analyzing data...</p>
                <Progress value={progress} className="w-full mt-2" />
                <p className="text-sm text-muted-foreground mt-2">{currentIndex} / {excelData.length} rows processed</p>
            </div>
          </div>
        );
      case 'finished':
        return results && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-6">
              <div className="p-4 bg-secondary rounded-lg">
                <p className="text-2xl font-bold">{results.totalRows}</p>
                <p className="text-sm text-muted-foreground">Total Rows</p>
              </div>
              <div className="p-4 bg-secondary rounded-lg">
                <p className="text-2xl font-bold text-green-600">{results.validRows}</p>
                <p className="text-sm text-muted-foreground">{isDryRun ? 'Valid' : 'Inserted'}</p>
              </div>
              <div className="p-4 bg-secondary rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">{results.skipped}</p>
                <p className="text-sm text-muted-foreground">Skipped</p>
              </div>
              <div className="p-4 bg-secondary rounded-lg">
                <p className="text-2xl font-bold text-destructive">{results.errors}</p>
                <p className="text-sm text-muted-foreground">Rows with Errors</p>
              </div>
            </div>
            {results.errors > 0 && (
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
                      {results.errorDetails.slice(0, 100).map((err, i) => (
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
        return (
            <div className="space-y-6">
                <div className="space-y-4 p-4 border rounded-lg bg-destructive/10 border-destructive">
                    <h3 className="font-semibold flex items-center gap-2"><Trash2 className="h-4 w-4" />Pre-Import Actions</h3>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="delete-all" checked={deleteAll} onCheckedChange={(checked) => setDeleteAll(!!checked)} />
                        <Label htmlFor="delete-all">Delete all existing data from the destination table before import.</Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Warning: This action is irreversible and will permanently delete all data in the target table.
                    </p>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4 p-4 border rounded-lg">
                        <h3 className="font-semibold flex items-center gap-2"><Info className="h-4 w-4" />Duplicate Handling</h3>
                        <RadioGroup value={duplicateStrategy} onValueChange={setDuplicateStrategy}>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="insert_only" id="r1" /><Label htmlFor="r1">Insert all (no duplicate check)</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="skip" id="r2" /><Label htmlFor="r2">Skip duplicates if they exist</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="upsert" id="r3" /><Label htmlFor="r3">Update if exists, insert if not (Upsert)</Label></div>
                        </RadioGroup>
                    </div>
                    <div className="space-y-4 p-4 border rounded-lg">
                        <h3 className="font-semibold flex items-center gap-2"><Info className="h-4 w-4" />Error Handling</h3>
                        <RadioGroup value={strictMode} onValueChange={setStrictMode}>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="tolerant" id="r4" /><Label htmlFor="r4">Tolerant Mode (inserts valid rows, reports errors)</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="strict" id="r5" /><Label htmlFor="r5">Strict Mode (if one error occurs, nothing is inserted)</Label></div>
                        </RadioGroup>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="batch-size">Batch Size</Label>
                    <Input id="batch-size" type="number" value={batchSize} onChange={e => setBatchSize(e.target.value)} placeholder="e.g. 1000" />
                    <p className="text-xs text-muted-foreground">Number of rows to insert per transaction.</p>
                </div>
            </div>
        );
    }
  };

 const getTitle = () => {
    switch (status) {
        case 'running': return isDryRun ? 'Simulating Job...' : 'Running Job...';
        case 'finished': return isDryRun ? 'Simulation Complete' : 'Job Complete';
        default: return 'Configuration and Execution';
    }
 };
 
 const getDescription = () => {
     switch (status) {
        case 'running': return `Processing ${excelData.length} rows from ${fileName}. This may take a moment.`;
        case 'finished': return `Results for ${fileName}.`;
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
        <Button variant="outline" onClick={onBack} disabled={status === 'running'}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        
        {status === 'finished' ? (
             <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleDownload('errors')} disabled={!results?.errors}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Errors (CSV)
                </Button>
                <Button onClick={onNewJob}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Start New Job
                </Button>
            </div>
        ) : (
            <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleRun(true)} disabled={status === 'running'}>
                    {status === 'running' && isDryRun ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                    Dry Run
                </Button>
                <Button onClick={() => handleRun(false)} disabled={status === 'running'} className="bg-green-600 text-white hover:bg-green-700">
                    {status === 'running' && !isDryRun ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                    Start Real Job
                </Button>
            </div>
        )}
      </CardFooter>
    </Card>
  );
}

    