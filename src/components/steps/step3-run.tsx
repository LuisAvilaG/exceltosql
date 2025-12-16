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
import { ArrowRight, ArrowLeft, Play, RefreshCw, Download, Info } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
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

  useEffect(() => {
    let interval: NodeJS.Timeout;
    let startTime: number;

    if (status === 'running') {
      startTime = Date.now();
      setProgress(0);
      setEta('Calculando...');

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
                { row: 4, column: 'SalesDate', value: 'Invalid Date', error: 'Formato de fecha inválido' },
                { row: 5, column: 'MeraLocationId', value: 'ABC', error: 'Debe ser un número entero' }
              ],
            });
            return 100;
          }

          const newProgress = prev + 5;
          const elapsedTime = (Date.now() - startTime) / 1000;
          const estimatedTotalTime = (elapsedTime / newProgress) * 100;
          const remainingTime = Math.round(estimatedTotalTime - elapsedTime);
          setEta(`${remainingTime}s restantes`);

          return newProgress;
        });
      }, 500);
    }
    return () => clearInterval(interval);
  }, [status, excelData.length]);

  const handleRun = (dryRun: boolean) => {
    setIsDryRun(dryRun);
    setStatus('running');
    toast({
      title: dryRun ? 'Iniciando simulación...' : 'Iniciando carga...',
      description: `Procesando archivo ${fileName}.`
    });
  };
  
  const handleDownload = (type: 'errors' | 'summary') => {
      toast({
          title: 'Función no implementada',
          description: `La descarga del reporte de ${type} es una simulación.`,
      });
  };

  if (status === 'running' || status === 'finished') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {status === 'running' ? (isDryRun ? 'Simulando Carga...' : 'Ejecutando Carga...') : (isDryRun ? 'Simulación Completada' : 'Carga Completada')}
          </CardTitle>
          <CardDescription>
            {status === 'running' ? `Procesando ${excelData.length} filas del archivo ${fileName}.` : `Resultados para ${fileName}.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Progress value={progress} />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Progreso: {Math.round(progress)}%</span>
              {status === 'running' && <span>{eta}</span>}
            </div>
          </div>
          {status === 'finished' && results && (
            <div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-6">
                    <div className="p-4 bg-secondary rounded-lg">
                        <p className="text-2xl font-bold">{results.total}</p>
                        <p className="text-sm text-muted-foreground">Filas Totales</p>
                    </div>
                    <div className="p-4 bg-secondary rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{results.inserted}</p>
                        <p className="text-sm text-muted-foreground">Insertadas</p>
                    </div>
                    <div className="p-4 bg-secondary rounded-lg">
                        <p className="text-2xl font-bold text-yellow-600">{results.skipped}</p>
                        <p className="text-sm text-muted-foreground">Omitidas</p>
                    </div>
                    <div className="p-4 bg-secondary rounded-lg">
                        <p className="text-2xl font-bold text-destructive">{results.errors}</p>
                        <p className="text-sm text-muted-foreground">Con Error</p>
                    </div>
                </div>

                {results.errors > 0 && (
                    <div>
                        <h3 className="font-semibold mb-2">Detalle de Errores</h3>
                        <div className="h-60 overflow-auto border rounded-lg">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Fila (Excel)</TableHead>
                                        <TableHead>Columna</TableHead>
                                        <TableHead>Valor</TableHead>
                                        <TableHead>Motivo del Error</TableHead>
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
                        Descargar Errores (CSV)
                    </Button>
                    <Button variant="outline" onClick={() => handleDownload('summary')}>
                        <Download className="mr-2 h-4 w-4" />
                        Descargar Resumen
                    </Button>
                </div>
            )}
            <Button onClick={onNewJob} className="ml-auto">
                <RefreshCw className="mr-2 h-4 w-4" />
                Iniciar Nueva Carga
            </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paso 3: Configuración y Ejecución</CardTitle>
        <CardDescription>
          Define los últimos detalles y comienza la carga de datos a SQL Server.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4 p-4 border rounded-lg">
                <h3 className="font-semibold flex items-center gap-2"><Info className="h-4 w-4" />Estrategia de Duplicados</h3>
                <RadioGroup value={duplicateStrategy} onValueChange={setDuplicateStrategy}>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="insert_only" id="r1" />
                        <Label htmlFor="r1">Insertar todo (no revisa duplicados)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="skip" id="r2" />
                        <Label htmlFor="r2">Omitir duplicados si ya existen</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="upsert" id="r3" />
                        <Label htmlFor="r3">Actualizar si existe, insertar si no (Upsert)</Label>
                    </div>
                </RadioGroup>
            </div>
            <div className="space-y-4 p-4 border rounded-lg">
                <h3 className="font-semibold flex items-center gap-2"><Info className="h-4 w-4" />Manejo de Errores</h3>
                <RadioGroup value={strictMode} onValueChange={setStrictMode}>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="tolerant" id="r4" />
                        <Label htmlFor="r4">Modo Tolerante (inserta filas válidas y reporta errores)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="strict" id="r5" />
                        <Label htmlFor="r5">Modo Estricto (si hay 1 error, no inserta nada)</Label>
                    </div>
                </RadioGroup>
            </div>
        </div>
        <div className="space-y-2">
            <Label htmlFor="batch-size">Tamaño de Lote (batch size)</Label>
            <Input id="batch-size" type="number" value={batchSize} onChange={e => setBatchSize(e.target.value)} placeholder="Ej: 1000" />
            <p className="text-xs text-muted-foreground">Número de filas a insertar por transacción.</p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Atrás
        </Button>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleRun(true)}>
                <Play className="mr-2 h-4 w-4" />
                Simulación (Dry Run)
            </Button>
            <Button onClick={() => handleRun(false)} className="bg-accent text-accent-foreground hover:bg-accent/90">
                <ArrowRight className="mr-2 h-4 w-4" />
                Iniciar Carga
            </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
