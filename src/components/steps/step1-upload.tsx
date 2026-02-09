
'use client';

import { useState } from 'react';
import type { DragEvent } from 'react';
import * as XLSX from 'xlsx';
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
import { UploadCloud, FileSpreadsheet, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExcelData } from '@/lib/types';
import { useDataContext } from '@/context/data-context';

export function Step1Upload() {
  const { setStep, setExcelData, setExcelHeaders, setFileName, setColumnMapping } = useDataContext();
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ExcelData>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [fullData, setFullData] = useState<ExcelData>([]);

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const processFile = (file: File) => {
    if (
      file.type ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.name.endsWith('.xlsx')
    ) {
      setFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result;
        // Read file without auto-parsing dates to ensure we control the logic
        const wb = XLSX.read(data, { type: 'array' });
        setWorkbook(wb);
        const sheets = wb.SheetNames;
        setSheetNames(sheets);
        if (sheets.length > 0) {
            handleSheetChange(sheets[0], wb);
            setSelectedSheet(sheets[0]);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert('Please upload an Excel file (.xlsx).');
    }
  };

  const handleSheetChange = (sheetName: string, wb: XLSX.WorkBook | null = workbook) => {
    if (!wb) return;
    setSelectedSheet(sheetName);
    const ws = wb.Sheets[sheetName];
    // Get formatted strings from Excel, not raw values or auto-parsed dates
    const dataRows = XLSX.utils.sheet_to_json(ws, { raw: false }) as ExcelData;
    
    if (dataRows.length > 0) {
        const fileHeaders = Object.keys(dataRows[0]);
        
        const formattedData = dataRows.map(row => {
            const newRow = {...row};
            const dateHeader = fileHeaders.find(h => h.toLowerCase() === 'salesdate');

            if (dateHeader && newRow[dateHeader]) {
                const dateStr = String(newRow[dateHeader]).trim();
                let finalDate: Date | null = null;

                if (dateStr) {
                    const parts = dateStr.includes('/') ? dateStr.split('/') : dateStr.split('-');
                    if (parts.length === 3) {
                        let day: number, month: number, year: number;

                        if (dateStr.includes('/')) {
                            // Strictly assume D/M/Y format for '/'
                            day = parseInt(parts[0], 10);
                            month = parseInt(parts[1], 10);
                            const yearRaw = parts[2];
                            year = parseInt(yearRaw.length === 2 ? '20' + yearRaw : yearRaw, 10);
                        } else {
                            // Strictly assume Y-M-D format for '-'
                            year = parseInt(parts[0], 10);
                            month = parseInt(parts[1], 10);
                            day = parseInt(parts[2], 10);
                        }

                        if (year && month && day && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                            const candidateDate = new Date(Date.UTC(year, month - 1, day));
                            if (candidateDate.getUTCFullYear() === year && candidateDate.getUTCMonth() === month - 1 && candidateDate.getUTCDate() === day) {
                                finalDate = candidateDate;
                            }
                        }
                    }
                }
                
                if (finalDate) {
                    newRow[dateHeader] = finalDate.toISOString().split('T')[0];
                }
            }
            return newRow;
        });

        setHeaders(fileHeaders);
        setFullData(formattedData);
        setPreviewData(formattedData.slice(0, 50));
    } else {
        const headerData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        if (headerData.length > 0) {
            const fileHeaders = headerData[0].map(String);
            setHeaders(fileHeaders);
        } else {
            setHeaders([]);
        }
        setPreviewData([]);
        setFullData([]);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleNextStep = () => {
    if (file) {
        setExcelData(fullData);
        setExcelHeaders(headers);
        setFileName(file.name);
        setColumnMapping({}); // Reset mapping
        setStep(2);
    }
  };

  const formatCell = (value: any) => {
    return String(value ?? '');
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Step 1: Upload Excel File</CardTitle>
        <CardDescription>
          Drag and drop your .xlsx file here or click to select it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!file ? (
          <div
            className={cn(
              'relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
              isDragging
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50'
            )}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <label htmlFor="file-upload-input" className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
              <UploadCloud className="w-12 h-12 text-muted-foreground" />
              <p className="mt-4 text-center text-muted-foreground">
                Drag and drop your file here, or{' '}
                <span className="font-semibold text-primary">click to browse</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">Only .xlsx files</p>
            </label>
            <input id="file-upload-input" type="file" accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileSelect} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <FileSpreadsheet className="h-8 w-8 text-green-600" />
              <div>
                <p className="font-semibold">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
            {sheetNames.length > 0 && (
                <div className="space-y-2">
                <label className="text-sm font-medium">
                    Select Sheet
                </label>
                <Select value={selectedSheet} onValueChange={handleSheetChange}>
                    <SelectTrigger>
                    <SelectValue placeholder="Select a sheet" />
                    </SelectTrigger>
                    <SelectContent>
                        {sheetNames.map(name => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                </div>
            )}
            <div>
              <h3 className="font-semibold mb-2">Data Preview</h3>
              <div className="h-80 overflow-auto border rounded-lg">
                <Table>
                  <TableHeader className="sticky top-0 bg-card">
                    <TableRow>
                      {headers.map((header) => (
                        <TableHead key={header}>{header}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {headers.map((header) => (
                          <TableCell key={`${rowIndex}-${header}`}>
                            {formatCell(row[header])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleNextStep}
          disabled={!file}
          className="ml-auto"
        >
          Next: Map Columns
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
