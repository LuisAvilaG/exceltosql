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
      title: 'Función no implementada',
      description: `La descarga de logs para el trabajo ${jobId} es una simulación.`,
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
            Probar Conexión
          </Button>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <History className="mr-2 h-4 w-4" />
                Historial de Cargas
              </Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-3xl w-full">
              <SheetHeader>
                <SheetTitle>Historial de Cargas</SheetTitle>
                <SheetDescription>
                  Revisa el estado y los resultados de las cargas anteriores.
                </SheetDescription>
              </SheetHeader>
              <div className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Archivo</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Resultado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockJobHistory.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell className="font-medium">
                          {job.fileName}
                        </TableCell>
                        <TableCell>
                          {format(job.date, 'dd/MM/yyyy HH:mm')}
                        </TableCell>
                        <TableCell>{job.result}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownloadLogs(job.id)}
                            aria-label="Descargar logs"
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
            <DialogTitle>Probar Conexión a SQL Server</DialogTitle>
            <DialogDescription>
              Verifica si la aplicación puede conectarse a la base de datos con
              la configuración actual.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Las credenciales de conexión se configuran mediante variables de
              entorno (ej. SQL_HOST, SQL_USER, etc.) y no se muestran aquí por
              seguridad.
            </p>
            {testStatus === 'success' && (
              <Alert variant="default" className="border-green-500">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertTitle>Conexión Exitosa</AlertTitle>
                <AlertDescription>
                  La conexión con la base de datos se ha establecido
                  correctamente.
                </AlertDescription>
              </Alert>
            )}
            {testStatus === 'error' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error de Conexión</AlertTitle>
                <AlertDescription>
                  No se pudo conectar a la base de datos. Revisa las variables
                  de entorno y la red.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={handleTestConnection}
              disabled={testStatus === 'testing'}
            >
              {testStatus === 'testing'
                ? 'Probando...'
                : 'Iniciar Prueba'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
