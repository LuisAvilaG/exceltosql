
'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { ExcelData, ColumnMapping, DataContextType, JobResult } from '@/lib/types';

const DataContext = createContext<DataContextType | undefined>(undefined);

const initialState = {
    step: 1,
    excelData: [],
    excelHeaders: [],
    fileName: '',
    columnMapping: {},
    validRows: [],
    jobResult: null,
    isDryRun: false,
    lastRunFingerprints: new Set<string>(),
    viewMode: 'wizard' as 'wizard' | 'viewer',
};

export function DataProvider({ children }: { children: ReactNode }) {
    const [step, setStep] = useState(initialState.step);
    const [excelData, setExcelData] = useState<ExcelData[]>(initialState.excelData);
    const [excelHeaders, setExcelHeaders] = useState<string[]>(initialState.excelHeaders);
    const [fileName, setFileName] = useState(initialState.fileName);
    const [columnMapping, setColumnMapping] = useState<ColumnMapping>(initialState.columnMapping);
    const [validRows, setValidRows] = useState<ExcelData[]>(initialState.validRows);
    const [jobResult, setJobResult] = useState<JobResult | null>(initialState.jobResult);
    const [isDryRun, setIsDryRun] = useState(initialState.isDryRun);
    const [lastRunFingerprints, setLastRunFingerprints] = useState<Set<string>>(initialState.lastRunFingerprints);
    const [viewMode, setViewMode] = useState<'wizard' | 'viewer'>(initialState.viewMode);


    const resetData = () => {
        setStep(initialState.step);
        setExcelData(initialState.excelData);
        setExcelHeaders(initialState.excelHeaders);
        setFileName(initialState.fileName);
        setColumnMapping(initialState.columnMapping);
        setValidRows(initialState.validRows);
        setJobResult(initialState.jobResult);
        setIsDryRun(initialState.isDryRun);
        setLastRunFingerprints(initialState.lastRunFingerprints);
        setViewMode(initialState.viewMode);
    };

    const showStandaloneViewer = () => {
        setLastRunFingerprints(new Set<string>());
        setViewMode('viewer');
    };

    const value = {
        step,
        setStep,
        excelData,
        setExcelData,
        excelHeaders,
        setExcelHeaders,
        fileName,
        setFileName,
        columnMapping,
        setColumnMapping,
        validRows,
        setValidRows,
        jobResult,
        setJobResult,
        isDryRun,
        setIsDryRun,
        lastRunFingerprints,
        setLastRunFingerprints,
        resetData,
        viewMode,
        setViewMode,
        showStandaloneViewer,
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useDataContext() {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useDataContext must be used within a DataProvider');
    }
    return context;
}
