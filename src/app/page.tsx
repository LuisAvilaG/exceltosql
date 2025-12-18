'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { Step1Upload } from '@/components/steps/step1-upload';
import { Step2Mapping } from '@/components/steps/step2-mapping';
import { Step3Run } from '@/components/steps/step3-run';
import type { ColumnMapping } from '@/lib/types';

export type ExcelData = { [key: string]: string | number | null }[];

export default function Home() {
  const [step, setStep] = useState(1);
  const [excelData, setExcelData] = useState<ExcelData>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});

  const handleFileLoaded = (
    data: ExcelData,
    headers: string[],
    name: string
  ) => {
    setExcelData(data);
    setExcelHeaders(headers);
    setFileName(name);
    setColumnMapping({}); // Reset mapping when new file is loaded
    setStep(2);
  };

  const handleMappingComplete = (
    mapping: ColumnMapping
  ) => {
    setColumnMapping(mapping);
    setStep(3);
  };

  const handleBackToMapping = () => {
    setStep(2);
  };

  const handleNewJob = () => {
    setStep(1);
    // Reset all state for a new job
    setExcelData([]);
    setExcelHeaders([]);
    setFileName('');
    setColumnMapping({});
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return <Step1Upload onFileLoaded={handleFileLoaded} />;
      case 2:
        return (
          <Step2Mapping
            excelHeaders={excelHeaders}
            initialMapping={columnMapping}
            onMappingComplete={handleMappingComplete}
            onBack={() => setStep(1)}
          />
        );
      case 3:
        return (
          <Step3Run
            fileName={fileName}
            excelData={excelData}
            columnMapping={columnMapping}
            onBack={handleBackToMapping}
            onNewJob={handleNewJob}
          />
        );
      default:
        return <Step1Upload onFileLoaded={handleFileLoaded} />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto">{renderStep()}</div>
      </main>
    </div>
  );
}

    