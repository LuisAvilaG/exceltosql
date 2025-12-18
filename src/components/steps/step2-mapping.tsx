
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
import { ArrowRight, ArrowLeft, Settings, Info, PlusCircle, X } from 'lucide-react';
import { tableColumns } from '@/lib/schema';
import type { SqlColumn } from '@/lib/types';
import { Badge } from '../ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { useDataContext } from '@/context/data-context';

export function Step2Mapping() {
  const { excelHeaders, columnMapping, setColumnMapping, setStep } = useDataContext();
  
  const [destinationColumns, setDestinationColumns] = useState<SqlColumn[]>([]);
  const [columnToAdd, setColumnToAdd] = useState('');

  useEffect(() => {
    const autoMapping: { [key: string]: string | null } = {};
    const matchedSqlColumns = new Set<string>();

    tableColumns.forEach(sqlCol => {
      const similarHeader = excelHeaders.find(h => h.toLowerCase().replace(/[^a-z0-9]/gi, '') === sqlCol.name.toLowerCase().replace(/[^a-z0-9]/gi, ''));
      if (similarHeader) {
        autoMapping[sqlCol.name] = similarHeader;
        matchedSqlColumns.add(sqlCol.name);
      }
    });

    const initialCols = tableColumns.filter(col => {
      if (col.isIdentity) return false;
      if (col.isRequired) return true;
      if (matchedSqlColumns.has(col.name)) return true;
      return false;
    });

    setDestinationColumns(initialCols);
    setColumnMapping(prev => ({ ...autoMapping, ...prev }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [excelHeaders]);
  
  const handleMappingChange = (sqlColumn: string, excelColumn: string) => {
    setColumnMapping((prev) => ({ ...prev, [sqlColumn]: excelColumn === 'none' ? null : excelColumn }));
  };

  const handleNext = () => {
    setStep(3);
  };

  const addColumn = () => {
    if (!columnToAdd) return;
    const column = tableColumns.find(c => c.name === columnToAdd);
    if (column && !destinationColumns.find(c => c.name === columnToAdd)) {
      setDestinationColumns(prev => [...prev, column].sort((a,b) => tableColumns.findIndex(c => c.name === a.name) - tableColumns.findIndex(c => c.name === b.name)));
    }
    setColumnToAdd('');
  };

  const removeColumn = (columnName: string) => {
    const columnToRemove = tableColumns.find(c => c.name === columnName);
    if(columnToRemove && columnToRemove.isRequired) return; // Cannot remove required columns
    setDestinationColumns(prev => prev.filter(c => c.name !== columnName));
    setColumnMapping(prev => {
        const newMapping = {...prev};
        delete newMapping[columnName];
        return newMapping;
    });
  };

  const availableColumnsToAdd = tableColumns.filter(
    (col) => !col.isIdentity && !destinationColumns.some((dc) => dc.name === col.name)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 2: Column Mapping</CardTitle>
        <CardDescription>
          Assign columns from your Excel file to the columns of the destination SQL table. Add or remove optional SQL columns as needed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SQL Column (Destination)</TableHead>
                <TableHead>Excel Column (Source)</TableHead>
                <TableHead className="text-center">Transformations</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {destinationColumns.map((col) => (
                <TableRow key={col.name}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span>{col.name}</span>
                      <Badge variant="outline">{col.type}</Badge>
                      {col.isRequired && <Badge variant="destructive">Required</Badge>}
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
                      value={columnMapping[col.name] || 'none'}
                      onValueChange={(value) => handleMappingChange(col.name, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select source column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- Ignore --</SelectItem>
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
                        <Button variant="ghost" size="icon" disabled={!columnMapping[col.name]}>
                          <Settings className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="grid gap-4">
                          <div className="space-y-2">
                            <h4 className="font-medium leading-none">
                              Transformations
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              Apply rules to the '{columnMapping[col.name]}' column.
                            </p>
                          </div>
                          <div className="grid gap-2">
                            <div className="flex items-center space-x-2">
                                <Checkbox id={`trim-${col.name}`} />
                                <Label htmlFor={`trim-${col.name}`}>Trim spaces</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id={`clean-num-${col.name}`} disabled={!col.type.startsWith('decimal')} />
                                <Label htmlFor={`clean-num-${col.name}`}>Clean numbers (e.g. remove '$', ',')</Label>
                            </div>
                            <div>
                                <Label htmlFor={`default-${col.name}`}>Default value (if empty)</Label>
                                <Input id={`default-${col.name}`} placeholder="e.g. 0 or N/A" className="mt-1" />
                            </div>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                  <TableCell className="text-right">
                    {!col.isRequired && (
                        <Button variant="ghost" size="icon" onClick={() => removeColumn(col.name)}>
                            <X className="h-4 w-4 text-destructive" />
                        </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 flex items-center gap-2">
            <Select onValueChange={setColumnToAdd} value={columnToAdd}>
                <SelectTrigger className="w-[250px]">
                    <SelectValue placeholder="Add a destination column..." />
                </SelectTrigger>
                <SelectContent>
                    {availableColumnsToAdd.map(col => (
                        <SelectItem key={col.name} value={col.name}>{col.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Button variant="outline" onClick={addColumn} disabled={!columnToAdd || availableColumnsToAdd.length === 0}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Column
            </Button>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleNext}>
          Next: Configure & Run
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
