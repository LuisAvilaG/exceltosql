'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft, Play, RefreshCw, Download, Info, Trash2, Loader2 } from 'lucide-react';
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
import type { ColumnMapping, RunSettings, ExcelData } from '@/lib/types';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import type { ValidateDataOutput } from '@/ai/flows/validate-data-flow';
import { validateData } from '@/ai/flows/validate-data-flow';


interface Step3RunProps {
  fileName: string;
  excelData: ExcelData;
  columnMapping: ColumnMapping;
  runSettings: RunSettings;
  onBack: () => void;
  onNewJob: () => void;
}

type RunStatus = 'idle' | 'running' | 'finished';

export function Step3Run({
  fileName,
  excelData,
  columnMapping,
  onBack,
  onNewJob,
}: Step3RunProps) {
  const { toast } = useToast();
  const [status, setStatus] = useState<RunStatus>('idle');
  const [results, setResults] = useState<ValidateDataOutput | null>(null);
  const [isDryRun, setIsDryRun] = useState(false);

  // Settings state
  const [duplicateStrategy, setDuplicateStrategy] = useState('insert_only');
  const [strictMode, setStrictMode] = useState('tolerant');
  const [batchSize, setBatchSize] = useState('1000');
  const [deleteAll, setDeleteAll] = useState(false);

  const handleRun = (dryRun: boolean) => {
    // 1. Immediately update UI to show loading state
    setIsDryRun(dryRun);
    setStatus('running');
    setResults(null);
    toast({
      title: dryRun ? 'Starting simulation...' : 'Starting job...',
      description: `Validating ${excelData.length} rows from ${fileName}.`
    });

    // 2. Define the async operation to run in the background
    const runValidation = async () => {
        try {
            const currentSettings: RunSettings = {
                duplicateStrategy: duplicateStrategy as any,
                strictMode: strictMode === 'strict',
                batchSize: parseInt(batchSize, 10) || 1000,
            };
            
            // This server action runs on the server. The `await` here
            // does not block the UI because this function is async.
            const validationResult = await validateData({
                excelData,
                columnMapping,
                settings: currentSettings,
                isDryRun: dryRun,
            });
            
            setResults(validationResult);

            if(dryRun) {
                toast({
                    title: "Simulation Complete",
                    description: `Found ${validationResult.errors} rows with errors.`,
                });
            }

        } catch (error) {
            console.error("Validation failed", error);
            toast({
                variant: "destructive",
                title: "An Error Occurred",
                description: error instanceof Error ? error.message : "Could not complete the run.",
            });
        } finally {
            // 3. Update UI again when the background task is finished
            setStatus('finished');
        }
    };
    
    // 4. Execute the async operation. This call returns immediately.
    runValidation();
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
            {status === 'running' 
              ? (isDryRun ? 'Simulating Job...' : 'Running Job...') 
              : (isDryRun ? 'Simulation Complete' : 'Job Complete')}
          </CardTitle>
          <CardDescription>
            {status === 'running' 
              ? `Processing ${excelData.length} rows from ${fileName}. This may take a moment.` 
              : `Results for ${fileName}.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {status === 'running' && (
            <div className="flex flex-col items-center justify-center gap-4 p-8">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground">Analyzing data on the server...</p>
                 <p className="text-sm text-muted-foreground">The UI will not freeze.</p>
            </div>
          )}
          {status === 'finished' && results && (
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
                                        <TableHead>Row (Excel)</TableHead>
                                        <TableHead>Column</TableHead>
                                        <TableHead>Value</TableHead>
                                        <TableHead>Error Reason</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {results.errorDetails.slice(0, 100).map((err, i) => (
                                        <TableRow key={i}>
                                            <TableCell>{err.row}</TableCell>
                                            <TableCell>{err.column}</TableCell>
                                            <TableCell><Badge variant="destructive" className="max-w-xs truncate">{String(err.value)}</Badge></TableCell>
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
            <Button variant="outline" onClick={() => handleRun(true)} disabled={status === 'running'}>
               {status === 'running' && isDryRun ? <Loader2 className="animate-spin" /> : <Play />}
                Dry Run
            </Button>
            <Button onClick={() => handleRun(false)} disabled={status === 'running'} className="bg-accent text-accent-foreground hover:bg-accent/90">
                {status === 'running' && !isDryRun ? <Loader2 className="animate-spin" /> : <ArrowRight />}
                Start Job
            </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

    