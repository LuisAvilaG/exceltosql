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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ArrowRight, ArrowLeft, Settings, Info } from 'lucide-react';
import { tableColumns, type SqlColumn } from '@/lib/schema';
import type { ColumnMapping, RunSettings } from '@/lib/types';
import { Badge } from '../ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface Step2MappingProps {
  excelHeaders: string[];
  initialMapping: ColumnMapping;
  onMappingComplete: (mapping: ColumnMapping, settings: RunSettings) => void;
  onBack: () => void;
}

export function Step2Mapping({
  excelHeaders,
  initialMapping,
  onMappingComplete,
  onBack,
}: Step2MappingProps) {
  const [mapping, setMapping] = useState<ColumnMapping>(() => {
    // Auto-map based on similar names
    const autoMapping: ColumnMapping = {};
    tableColumns.forEach(col => {
      if (col.isIdentity) return;
      const similarHeader = excelHeaders.find(h => h.toLowerCase().replace(/ /g, '') === col.name.toLowerCase());
      autoMapping[col.name] = similarHeader || null;
    });
    return {...autoMapping, ...initialMapping};
  });
  
  const handleMappingChange = (sqlColumn: string, excelColumn: string) => {
    setMapping((prev) => ({ ...prev, [sqlColumn]: excelColumn === 'none' ? null : excelColumn }));
  };

  const handleNext = () => {
    // This is a placeholder for settings that would be configured here.
    const settings: RunSettings = {
      duplicateStrategy: 'insert_only',
      strictMode: true,
      batchSize: 1000,
    };
    onMappingComplete(mapping, settings);
  };
  
  const destinationColumns = tableColumns.filter((col) => !col.isIdentity);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paso 2: Mapeo de Columnas</CardTitle>
        <CardDescription>
          Asigna las columnas de tu archivo Excel a las columnas de la tabla SQL
          de destino.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Columna SQL (Destino)</TableHead>
                <TableHead>Columna Excel (Origen)</TableHead>
                <TableHead className="text-center">Transformaciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {destinationColumns.map((col) => (
                <TableRow key={col.name}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span>{col.name}</span>
                      <Badge variant="outline">{col.type}</Badge>
                      {col.isRequired && <Badge variant="destructive">Requerido</Badge>}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{col.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={mapping[col.name] || 'none'}
                      onValueChange={(value) => handleMappingChange(col.name, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar columna de origen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- Ignorar --</SelectItem>
                        {excelHeaders.map((header) => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-center">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={!mapping[col.name]}>
                          <Settings className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="grid gap-4">
                          <div className="space-y-2">
                            <h4 className="font-medium leading-none">
                              Transformaciones
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              Aplica reglas a la columna '{mapping[col.name]}'.
                            </p>
                          </div>
                          <div className="grid gap-2">
                            <div className="flex items-center space-x-2">
                                <Checkbox id={`trim-${col.name}`} />
                                <Label htmlFor={`trim-${col.name}`}>Quitar espacios (trim)</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id={`clean-num-${col.name}`} disabled={!col.type.startsWith('decimal')} />
                                <Label htmlFor={`clean-num-${col.name}`}>Limpiar números (ej. quitar '$', ',')</Label>
                            </div>
                            <div>
                                <Label htmlFor={`default-${col.name}`}>Valor por defecto (si está vacío)</Label>
                                <Input id={`default-${col.name}`} placeholder="Ej: 0 o N/A" className="mt-1" />
                            </div>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Atrás
        </Button>
        <Button onClick={handleNext}>
          Siguiente: Ejecutar Carga
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
