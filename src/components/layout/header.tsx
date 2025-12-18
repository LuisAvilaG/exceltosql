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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Database,
  FileSpreadsheet,
  ArrowRight,
  TestTube2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { testDbConnection } from '@/ai/flows/test-db-connection';

export function Header() {
  const [isTestConnOpen, setIsTestConnOpen] = useState(false);
  const [testStatus, setTestStatus] = useState<
    'idle' | 'testing' | 'success' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setErrorMessage('');
    try {
      const result = await testDbConnection();
      if (result.success) {
        setTestStatus('success');
      } else {
        setTestStatus('error');
        setErrorMessage(result.error || 'An unknown error occurred.');
      }
    } catch (error) {
      setTestStatus('error');
      setErrorMessage(error instanceof Error ? error.message : String(error));
    }
  };
  
  const resetTestState = () => {
    setTestStatus('idle');
    setErrorMessage('');
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
            onClick={() => {
              resetTestState();
              setIsTestConnOpen(true)
            }}
          >
            <TestTube2 className="mr-2 h-4 w-4" />
            Test Connection
          </Button>
        </div>
      </div>

      <Dialog open={isTestConnOpen} onOpenChange={(isOpen) => {
        setIsTestConnOpen(isOpen);
        if (!isOpen) {
            resetTestState();
        }
      }}>
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
                  {errorMessage || "Could not connect to the database. Check your environment variables and network connection."}
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
