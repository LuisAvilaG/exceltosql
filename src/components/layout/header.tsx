'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Database,
  FileSpreadsheet,
  ArrowRight,
  TestTube2,
  History,
  AlertCircle,
  CheckCircle2,
  Download,
} from 'lucide-react';
import { mockJobHistory } from '@/lib/placeholder-data';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export function Header() {
  const [isTestConnOpen, setIsTestConnOpen] = useState(false);
  const [testStatus, setTestStatus] = useState<
    'idle' | 'testing' | 'success' | 'error'
  >('idle');
  const { toast } = useToast();

  const handleTestConnection = () => {
    setTestStatus('testing');
    setTimeout(() => {
      if (Math.random() > 0.2) {
        setTestStatus('success');
      } else {
        setTestStatus('error');
      }
    }, 1500);
  };

  const handleDownloadLogs = (jobId: string) => {
    toast({
      title: 'Function not implemented',
      description: `Log download for job ${jobId} is a simulation.`,
    });
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-lg font-semibold text-primary">
            <FileSpreadsheet className="h-6 w-6" />
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
            <Database className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Excel → SQL Loader
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsTestConnOpen(true)}
          >
            <TestTube2 className="mr-2 h-4 w-4" />
            Test Connection
          </Button>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <History className="mr-2 h-4 w-4" />
                Job History
              </Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-3xl w-full">
              <SheetHeader>
                <SheetTitle>Job History</SheetTitle>
                <SheetDescription>
                  Review the status and results of previous jobs.
                </SheetDescription>
              </SheetHeader>
              <div className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockJobHistory.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell className="font-medium">
                          {job.fileName}
                        </TableCell>
                        <TableCell>
                          {format(job.date, 'MM/dd/yyyy HH:mm')}
                        </TableCell>
                        <TableCell>{job.result}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownloadLogs(job.id)}
                            aria-label="Download logs"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <Dialog open={isTestConnOpen} onOpenChange={setIsTestConnOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>SQL Server Connection</DialogTitle>
            <DialogDescription>
              Configure the connection to your SQL Server database using environment variables.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="prose prose-sm text-foreground">
              <p>
                To connect to your SQL Server, create a file named <code className="p-1 bg-muted rounded">.env.local</code> in the root of the project and add the following variables:
              </p>
              <pre className="p-4 bg-muted rounded text-sm">
                <code>
                  SQL_HOST=your_server_address
                  <br />
                  SQL_DATABASE=your_database_name
                  <br />
                  SQL_USER=your_username
                  <br />
                  SQL_PASSWORD=your_password
                  <br />
                  SQL_PORT=1433
                </code>
              </pre>
              <p className="text-xs text-muted-foreground">
                These credentials are used by the server and are not exposed to the client. Restart your application after creating the file.
              </p>
            </div>
            
            {testStatus === 'success' && (
              <Alert variant="default" className="border-green-500">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertTitle>Connection Successful</AlertTitle>
                <AlertDescription>
                  The connection to the database was established successfully.
                </AlertDescription>
              </Alert>
            )}
            {testStatus === 'error' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Connection Error</AlertTitle>
                <AlertDescription>
                  Could not connect to the database. Check your environment variables and network connection.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={handleTestConnection}
              disabled={testStatus === 'testing'}
            >
              {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
