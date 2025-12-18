
'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { ExcelData, ColumnMapping, DataContextType } from '@/lib/types';

const DataContext = createContext<DataContextType | undefined>(undefined);

const initialState = {
    step: 1,
    excelData: [],
    excelHeaders: [],
    fileName: '',
    columnMapping: {},
};

export function DataProvider({ children }: { children: ReactNode }) {
    const [step, setStep] = useState(initialState.step);
    const [excelData, setExcelData] = useState<ExcelData[]>(initialState.excelData);
    const [excelHeaders, setExcelHeaders] = useState<string[]>(initialState.excelHeaders);
    const [fileName, setFileName] = useState(initialState.fileName);
    const [columnMapping, setColumnMapping] = useState<ColumnMapping>(initialState.columnMapping);

    const resetData = () => {
        setStep(initialState.step);
        setExcelData(initialState.excelData);
        setExcelHeaders(initialState.excelHeaders);
        setFileName(initialState.fileName);
        setColumnMapping(initialState.columnMapping);
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
        resetData,
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
