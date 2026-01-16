
'use client';

import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RefreshCw, Search } from 'lucide-react';
import { useDataContext } from '@/context/data-context';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';

const ROWS_PER_PAGE = 50;

export function Step4JobReport() {
  const { jobResult, validRows, fileName, isDryRun, setStep, resetData } = useDataContext();
  
  const [activeTab, setActiveTab] = useState('success');
  const [successPage, setSuccessPage] = useState(1);
  const [errorPage, setErrorPage] = useState(1);
  const [filter, setFilter] = useState('');

  const filteredSuccessRows = useMemo(() => {
    if (!filter) return validRows;
    return validRows.filter(row => 
      Object.values(row).some(value => 
        String(value).toLowerCase().includes(filter.toLowerCase())
      )
    );
  }, [validRows, filter]);

  const filteredErrorRows = useMemo(() => {
    if (!jobResult?.errorDetails) return [];
    if (!filter) return jobResult.errorDetails;
    return jobResult.errorDetails.filter(err => 
        (String(err.row).toLowerCase().includes(filter.toLowerCase())) ||
        (err.column.toLowerCase().includes(filter.toLowerCase())) ||
        (String(err.value).toLowerCase().includes(filter.toLowerCase())) ||
        (err.error.toLowerCase().includes(filter.toLowerCase()))
    );
  }, [jobResult?.errorDetails, filter]);

  const successPages = Math.ceil(filteredSuccessRows.length / ROWS_PER_PAGE);
  const currentSuccessData = filteredSuccessRows.slice((successPage - 1) * ROWS_PER_PAGE, successPage * ROWS_PER_PAGE);
  
  const errorPages = jobResult ? Math.ceil(filteredErrorRows.length / ROWS_PER_PAGE) : 0;
  const currentErrorData = filteredErrorRows.slice((errorPage - 1) * ROWS_PER_PAGE, errorPage * ROWS_PER_PAGE);
  
  const handleNewJob = () => {
    resetData();
    setStep(1);
  };
  
  if (!jobResult) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Job Data</CardTitle>
          <CardDescription>
            No job has been run yet. Please go back and upload a file.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleNewJob}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Start New Job
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  const successHeaders = validRows.length > 0 ? Object.keys(validRows[0]) : [];

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>{isDryRun ? 'Validation Report' : 'Job Execution Report'}</CardTitle>
                <CardDescription>
                Results for the job on file <span className="font-semibold text-primary">{fileName}</span>.
                </CardDescription>
            </div>
            <Button onClick={handleNewJob}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Start New Job
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-6">
          <div className="p-4 bg-secondary rounded-lg">
            <p className="text-2xl font-bold">{jobResult.totalRows}</p>
            <p className="text-sm text-muted-foreground">Total Rows in File</p>
          </div>
          <div className="p-4 bg-secondary rounded-lg">
            <p className="text-2xl font-bold text-green-600">{jobResult.inserted}</p>
            <p className="text-sm text-muted-foreground">{isDryRun ? 'Valid Rows' : 'Rows Inserted'}</p>
          </div>
          <div className="p-4 bg-secondary rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{jobResult.updated}</p>
            <p className="text-sm text-muted-foreground">Rows Updated</p>
          </div>
          <div className="p-4 bg-secondary rounded-lg">
            <p className="text-2xl font-bold text-destructive">{jobResult.errors}</p>
            <p className="text-sm text-muted-foreground">Rows with Errors</p>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="success">
                {isDryRun ? 'Valid Rows' : 'Successfully Processed Rows'} ({jobResult.inserted})
              </TabsTrigger>
              <TabsTrigger value="errors">
                Rows with Errors ({jobResult.errors})
              </TabsTrigger>
            </TabsList>
            <div className="w-full max-w-sm ml-4 relative">
                <Input placeholder="Search in this tab..." value={filter} onChange={(e) => setFilter(e.target.value)} className="pl-10" />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            </div>
          </div>
          
          <TabsContent value="success">
            <div className="h-96 overflow-auto border rounded-lg">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    {successHeaders.map((header) => <TableHead key={header}>{header}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentSuccessData.map((row, i) => (
                    <TableRow key={i}>
                      {successHeaders.map(header => <TableCell key={header}>{String(row[header])}</TableCell>)}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-end space-x-2 py-4">
              <span className="text-sm text-muted-foreground">Page {successPage} of {successPages}</span>
              <Button variant="outline" size="sm" onClick={() => setSuccessPage(p => Math.max(1, p - 1))} disabled={successPage === 1}>Previous</Button>
              <Button variant="outline" size="sm" onClick={() => setSuccessPage(p => Math.min(successPages, p + 1))} disabled={successPage === successPages}>Next</Button>
            </div>
          </TabsContent>

          <TabsContent value="errors">
            <div className="h-96 overflow-auto border rounded-lg">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    <TableHead>Row (Excel)</TableHead><TableHead>Column</TableHead><TableHead>Value</TableHead><TableHead>Error Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentErrorData.map((err, i) => (
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
            <div className="flex items-center justify-end space-x-2 py-4">
                <span className="text-sm text-muted-foreground">Page {errorPage} of {errorPages}</span>
              <Button variant="outline" size="sm" onClick={() => setErrorPage(p => Math.max(1, p - 1))} disabled={errorPage === 1}>Previous</Button>
              <Button variant="outline" size="sm" onClick={() => setErrorPage(p => Math.min(errorPages, p + 1))} disabled={errorPage === errorPages}>Next</Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
