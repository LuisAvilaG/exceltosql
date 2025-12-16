'use client';

import { useState } from 'react';
import type { DragEvent } from 'react';
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
import { mockExcelData, mockExcelHeaders } from '@/lib/placeholder-data';
import type { ExcelData } from '@/app/page';

interface Step1UploadProps {
  onFileLoaded: (data: ExcelData, headers: string[], fileName: string) => void;
}

export function Step1Upload({ onFileLoaded }: Step1UploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ExcelData>([]);
  const [headers, setHeaders] = useState<string[]>([]);

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
      // Simulate file parsing
      setPreviewData(mockExcelData.slice(0, 50));
      setHeaders(mockExcelHeaders);
    } else {
      alert('Please upload an Excel file (.xlsx).');
    }
  }

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
      onFileLoaded(mockExcelData, mockExcelHeaders, file.name);
    }
  };

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
            <input id="file-upload-input" type="file" accept=".xlsx" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileSelect} />
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
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Select Sheet
              </label>
              <Select defaultValue="Sheet1">
                <SelectTrigger>
                  <SelectValue placeholder="Select a sheet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sheet1">USA Sales (Sheet1)</SelectItem>
                  <SelectItem value="Sheet2" disabled>
                    Another Sheet (Sheet2)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                            {String(row[header])}
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
