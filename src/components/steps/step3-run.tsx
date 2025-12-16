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
import { ArrowRight, ArrowLeft, Play, RefreshCw, Download, Info, Trash2 } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ColumnMapping, RunSettings, ExcelData } from '@/lib/types';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { tableColumns } from '@/lib/schema';

interface Step3RunProps {
  fileName: string;
  excelData: ExcelData;
  columnMapping: ColumnMapping;
  runSettings: RunSettings;
  onBack: () => void;
  onNewJob: () => void;
}

type RunStatus = 'idle' | 'running' | 'finished';
type RunResults = {
  total: number;
  inserted: number;
  skipped: number;
  errors: number;
  errorRows: any[];
};

export function Step3Run({
  fileName,
  excelData,
  columnMapping,
  onBack,
  onNewJob,
}: Step3RunProps) {
  const { toast } = useToast();
  const [status, setStatus] = useState<RunStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<RunResults | null>(null);
  const [eta, setEta] = useState('');
  const [isDryRun, setIsDryRun] = useState(false);

  // Settings state
  const [duplicateStrategy, setDuplicateStrategy] = useState('insert_only');
  const [strictMode, setStrictMode] = useState('tolerant');
  const [batchSize, setBatchSize] = useState('1000');
  const [deleteAll, setDeleteAll] = useState(false);


  const processDataForImport = () => {
    const allSqlColumns = tableColumns.map(c => c.name);

    return excelData.map(excelRow => {
        const transformedRow: { [key: string]: any } = {};

        allSqlColumns.forEach(sqlCol => {
            const mappedExcelCol = columnMapping[sqlCol];
            const columnSchema = tableColumns.find(c => c.name === sqlCol);

            if (mappedExcelCol && excelRow.hasOwnProperty(mappedExcelCol) && excelRow[mappedExcelCol] !== null && excelRow[mappedExcelCol] !== '') {
                transformedRow[sqlCol] = excelRow[mappedExcelCol];
            } else {
                // Handle default values for unmapped columns
                if (sqlCol === 'MeraAreaId') {
                    transformedRow[sqlCol] = null;
                } else if (sqlCol !== 'Id') { // Don't default identity column
                    if (columnSchema?.type.includes('decimal') || columnSchema?.type.includes('int')) {
                       transformedRow[sqlCol] = 0;
                    } else {
                       transformedRow[sqlCol] = null;
                    }
                }
            }
        });
        return transformedRow;
    });
  };


  useEffect(() => {
    let interval: NodeJS.Timeout;
    let startTime: number;

    if (status === 'running') {
      const processedData = processDataForImport();
      if (deleteAll) {
        console.log("Simulating: Deleting all previous data from the table.");
      }
      console.log('Simulating import with processed data:', processedData.slice(0, 5));

      startTime = Date.now();
      setProgress(0);
      setEta('Calculating...');

      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setStatus('finished');
            setResults({
              total: excelData.length,
              inserted: excelData.length - 2,
              skipped: 0,
              errors: 2,
              errorRows: [
                { row: 4, column: 'SalesDate', value: 'Invalid Date', error: 'Invalid date format' },
                { row: 5, column: 'MeraLocationId', value: 'ABC', error: 'Must be an integer' }
              ],
            });
            return 100;
          }

          const newProgress = prev + 5;
          const elapsedTime = (Date.now() - startTime) / 1000;
          const estimatedTotalTime = (elapsedTime / newProgress) * 100;
          const remainingTime = Math.round(estimatedTotalTime - elapsedTime);
          setEta(`${remainingTime}s remaining`);

          return newProgress;
        });
      }, 500);
    }
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, excelData.length, deleteAll]);

  const handleRun = (dryRun: boolean) => {
    setIsDryRun(dryRun);
    setStatus('running');
    toast({
      title: dryRun ? 'Starting simulation...' : 'Starting job...',
      description: `Processing file ${fileName}.`
    });
  };
  
  const handleDownload = (type: 'errors' | 'summary') => {
      toast({
          title: 'Function not implemented',
          description: `The ${type} report download is a simulation.`,
      });
  };

  if (status === 'running' || status === 'finished') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {status === 'running' ? (isDryRun ? 'Simulating Job...' : 'Running Job...') : (isDryRun ? 'Simulation Complete' : 'Job Complete')}
          </CardTitle>
          <CardDescription>
            {status === 'running' ? `Processing ${excelData.length} rows from ${fileName}.` : `Results for ${fileName}.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Progress value={progress} />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Progress: {Math.round(progress)}%</span>
              {status === 'running' && <span>{eta}</span>}
            </div>
          </div>
          {status === 'finished' && results && (
            <div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-6">
                    <div className="p-4 bg-secondary rounded-lg">
                        <p className="text-2xl font-bold">{results.total}</p>
                        <p className="text-sm text-muted-foreground">Total Rows</p>
                    </div>
                    <div className="p-4 bg-secondary rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{results.inserted}</p>
                        <p className="text-sm text-muted-foreground">Inserted</p>
                    </div>
                    <div className="p-4 bg-secondary rounded-lg">
                        <p className="text-2xl font-bold text-yellow-600">{results.skipped}</p>
                        <p className="text-sm text-muted-foreground">Skipped</p>
                    </div>
                    <div className="p-4 bg-secondary rounded-lg">
                        <p className="text-2xl font-bold text-destructive">{results.errors}</p>
                        <p className="text-sm text-muted-foreground">Errors</p>
                    </div>
                </div>

                {results.errors > 0 && (
                    <div>
                        <h3 className="font-semibold mb-2">Error Details</h3>
                        <div className="h-60 overflow-auto border rounded-lg">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Row (Excel)</TableHead>
                                        <TableHead>Column</TableHead>
                                        <TableHead>Value</TableHead>
                                        <TableHead>Error Reason</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {results.errorRows.map((err, i) => (
                                        <TableRow key={i}>
                                            <TableCell>{err.row}</TableCell>
                                            <TableCell>{err.column}</TableCell>
                                            <TableCell><Badge variant="destructive">{String(err.value)}</Badge></TableCell>
                                            <TableCell>{err.error}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
            {status === 'finished' && (
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleDownload('errors')} disabled={!results?.errors}>
                        <Download className="mr-2 h-4 w-4" />
                        Download Errors (CSV)
                    </Button>
                    <Button variant="outline" onClick={() => handleDownload('summary')}>
                        <Download className="mr-2 h-4 w-4" />
                        Download Summary
                    </Button>
                </div>
            )}
            <Button onClick={onNewJob} className="ml-auto">
                <RefreshCw className="mr-2 h-4 w-4" />
                Start New Job
            </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 3: Configuration and Execution</CardTitle>
        <CardDescription>
          Define the final details and start the data load to SQL Server.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="insert_only" id="r1" />
                        <Label htmlFor="r1">Insert all (no duplicate check)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="skip" id="r2" />
                        <Label htmlFor="r2">Skip duplicates if they exist</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="upsert" id="r3" />
                        <Label htmlFor="r3">Update if exists, insert if not (Upsert)</Label>
                    </div>
                </RadioGroup>
            </div>
            <div className="space-y-4 p-4 border rounded-lg">
                <h3 className="font-semibold flex items-center gap-2"><Info className="h-4 w-4" />Error Handling</h3>
                <RadioGroup value={strictMode} onValueChange={setStrictMode}>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="tolerant" id="r4" />
                        <Label htmlFor="r4">Tolerant Mode (inserts valid rows, reports errors)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="strict" id="r5" />
                        <Label htmlFor="r5">Strict Mode (if one error occurs, nothing is inserted)</Label>
                    </div>
                </RadioGroup>
            </div>
        </div>
        <div className="space-y-2">
            <Label htmlFor="batch-size">Batch Size</Label>
            <Input id="batch-size" type="number" value={batchSize} onChange={e => setBatchSize(e.target.value)} placeholder="e.g. 1000" />
            <p className="text-xs text-muted-foreground">Number of rows to insert per transaction.</p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleRun(true)}>
                <Play className="mr-2 h-4 w-4" />
                Dry Run
            </Button>
            <Button onClick={() => handleRun(false)} className="bg-accent text-accent-foreground hover:bg-accent/90">
                <ArrowRight className="mr-2 h-4 w-4" />
                Start Job
            </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
