
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { RefreshCw, Search, SlidersHorizontal, Loader2, CalendarIcon, ArrowLeft, Package, CheckCircle, AlertTriangle } from 'lucide-react';
import { useDataContext } from '@/context/data-context';
import { Input } from '../ui/input';
import { tableColumns } from '@/lib/schema';
import type { ExcelData } from '@/lib/types';
import { viewData } from '@/ai/flows/view-data-flow';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Label } from '../ui/label';

const ROWS_PER_PAGE = 50;

const filterableColumns = ['MeraLocationId', 'MeraRevenueCenterName', 'MeraAreaId'];

type Filters = {
    [key: string]: any;
    SalesDate: {
        startDate: Date | undefined;
        endDate: Date | undefined;
    }
}

function ValidationReport() {
    const { jobResult, setStep, resetData } = useDataContext();

    const handleNewJob = () => {
        resetData();
        setStep(1);
    };

    if (!jobResult) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Validation Incomplete</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>No validation results found. Please go back and run a validation.</p>
                </CardContent>
                <CardFooter>
                    <Button variant="outline" onClick={() => setStep(3)}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
                    </Button>
                </CardFooter>
            </Card>
        );
    }

    const { totalRows, inserted, errors, errorDetails } = jobResult;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Validation Report (Dry Run)</CardTitle>
                <CardDescription>
                    Review of your data before the real import. No data has been written to the database.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4 md:grid-cols-3 mb-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Rows in File</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalRows}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Valid Rows</CardTitle>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{inserted}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Rows with Errors</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{errors}</div>
                        </CardContent>
                    </Card>
                </div>

                {errors > 0 && errorDetails && errorDetails.length > 0 && (
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="item-1">
                            <AccordionTrigger>View {errors} Error(s)</AccordionTrigger>
                            <AccordionContent>
                                <div className="h-80 overflow-auto border rounded-lg">
                                    <Table>
                                        <TableHeader className="sticky top-0 bg-card">
                                            <TableRow>
                                                <TableHead>Row</TableHead>
                                                <TableHead>Column</TableHead>
                                                <TableHead>Value</TableHead>
                                                <TableHead>Error</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {errorDetails.map((err, i) => (
                                                <TableRow key={i} className="bg-destructive/10">
                                                    <TableCell>{err.row}</TableCell>
                                                    <TableCell>{err.column}</TableCell>
                                                    <TableCell>
                                                        <pre className="text-xs whitespace-pre-wrap">{String(err.value ?? 'NULL')}</pre>
                                                    </TableCell>
                                                    <TableCell>{err.error}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                )}
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={handleNewJob}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Start New Job
                </Button>
                <Button onClick={() => setStep(3)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Run Step
                </Button>
            </CardFooter>
        </Card>
    );
}


function LiveDataViewer() {
    const { lastRunFingerprints, setStep, resetData } = useDataContext();
    const [data, setData] = useState<ExcelData[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState<Filters>({ SalesDate: { startDate: undefined, endDate: undefined } });
    const [appliedFilters, setAppliedFilters] = useState<Partial<Filters>>({ SalesDate: { startDate: undefined, endDate: undefined } });
  
    const fetchAndSetData = useCallback(async () => {
      setIsLoading(true);
      
      const currentFilters = appliedFilters;
      const dateRangePayload = currentFilters.SalesDate && (currentFilters.SalesDate.startDate || currentFilters.SalesDate.endDate)
        ? {
            startDate: currentFilters.SalesDate.startDate
              ? format(currentFilters.SalesDate.startDate, 'yyyy-MM-dd')
              : undefined,
            endDate: currentFilters.SalesDate.endDate
              ? format(currentFilters.SalesDate.endDate, 'yyyy-MM-dd')
              : undefined,
          }
        : undefined;
  
      const viewDataInput = {
        page: currentPage,
        rowsPerPage: ROWS_PER_PAGE,
        filters: Object.fromEntries(Object.entries(appliedFilters).filter(([key, _]) => key !== 'SalesDate')),
        dateRange: dateRangePayload,
        sortBy: 'SalesDate',
        sortOrder: 'desc' as 'desc',
      };
      
      try {
        const result = await viewData(viewDataInput);
        setData(result.rows);
        setTotalCount(result.totalCount);
      } catch (error) {
        console.error("Failed to fetch data:", error);
        setData([]);
        setTotalCount(0);
      } finally {
        setIsLoading(false);
      }
    }, [currentPage, appliedFilters]);
  
    useEffect(() => {
      fetchAndSetData();
    }, [fetchAndSetData]);
  
    const handleApplyFilters = () => {
        setCurrentPage(1);
        setAppliedFilters(filters);
    };
    
    const handleClearFilters = () => {
        const cleared = { SalesDate: { startDate: undefined, endDate: undefined } };
        setFilters(cleared);
        setCurrentPage(1);
        setAppliedFilters(cleared);
    };
  
    const handleNewJob = () => {
      resetData();
      setStep(1);
    };
  
    const handleFilterChange = (column: string, value: any) => {
        setFilters(prev => ({ ...prev, [column]: value }));
    };
  
    const getRowFingerprint = (row: ExcelData) => {
      return `${row.SalesDate}|${row.MeraLocationId}|${row.MeraRevenueCenterId}|${row.Sales}`;
    }
  
    const totalPages = Math.ceil(totalCount / ROWS_PER_PAGE);

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Live Data Viewer</CardTitle>
                        <CardDescription>
                        Browse, filter, and validate data directly from the database. Rows from the last job are highlighted.
                        </CardDescription>
                    </div>
                    <Button onClick={handleNewJob}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Start New Job
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible className="mb-4">
                    <AccordionItem value="filters">
                        <AccordionTrigger>
                            <h3 className="font-semibold flex items-center gap-2"><SlidersHorizontal className="h-4 w-4" /> Filters</h3>
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
                                <div className="space-y-2">
                                    <Label>Sales Date Range</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                        <Button
                                            id="date"
                                            variant={"outline"}
                                            className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !filters.SalesDate?.startDate && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {filters.SalesDate?.startDate ? (
                                            filters.SalesDate.endDate ? (
                                                <>
                                                {format(filters.SalesDate.startDate, "LLL dd, y")} -{" "}
                                                {format(filters.SalesDate.endDate, "LLL dd, y")}
                                                </>
                                            ) : (
                                                format(filters.SalesDate.startDate, "LLL dd, y")
                                            )
                                            ) : (
                                            <span>Pick a date range</span>
                                            )}
                                        </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            initialFocus
                                            mode="range"
                                            defaultMonth={filters.SalesDate?.startDate}
                                            selected={{from: filters.SalesDate?.startDate, to: filters.SalesDate?.endDate}}
                                            onSelect={(range) => handleFilterChange('SalesDate', {startDate: range?.from, endDate: range?.to})}
                                            numberOfMonths={2}
                                        />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                
                                {filterableColumns.map(colName => (
                                    <div key={colName} className="space-y-2">
                                        <Label htmlFor={`filter-${colName}`}>{colName}</Label>
                                        <Input 
                                            id={`filter-${colName}`}
                                            placeholder={`Filter by ${colName}...`}
                                            value={filters[colName] || ''}
                                            onChange={(e) => handleFilterChange(colName, e.target.value)}
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end gap-2 px-4 pb-2">
                                <Button variant="ghost" onClick={handleClearFilters} disabled={isLoading}>Clear</Button>
                                <Button onClick={handleApplyFilters} disabled={isLoading}>
                                    {isLoading ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Search className="mr-2 h-4 w-4" />
                                    )}
                                    {isLoading ? 'Filtering...' : 'Apply Filters'}
                                </Button>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
                
                <div className="min-h-[400px] overflow-auto border rounded-lg relative">
                    {isLoading && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    )}
                    <Table>
                        <TableHeader className="sticky top-0 bg-card">
                        <TableRow>
                            {tableColumns.map((header) => <TableHead key={header.name}>{header.name}</TableHead>)}
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {data.length > 0 ? data.map((row, i) => {
                            const fingerprint = getRowFingerprint(row);
                            const isRecent = lastRunFingerprints.has(fingerprint);
                            return (
                                <TableRow key={i} className={isRecent ? 'bg-green-100 dark:bg-green-900/20 hover:bg-green-200/80 dark:hover:bg-green-900/30' : ''}>
                                    {tableColumns.map(col => <TableCell key={col.name}>{String(row[col.name] ?? '')}</TableCell>)}
                                </TableRow>
                            );
                        }) : (
                            !isLoading && <TableRow><TableCell colSpan={tableColumns.length} className="text-center">No data found.</TableCell></TableRow>
                        )}
                        </TableBody>
                    </Table>
                </div>
                <div className="flex items-center justify-end space-x-2 py-4">
                    <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1 || isLoading}>Previous</Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || isLoading}>Next</Button>
                </div>
            </CardContent>
        </Card>
    );
}

export function Step4JobReport() {
    const { viewMode, isDryRun } = useDataContext();
    
    // 1. After a Dry Run in the wizard, show the report.
    const showValidationReport = viewMode === 'wizard' && isDryRun;

    if (showValidationReport) {
        return <ValidationReport />;
    }

    // 2. In all other cases (after a real run OR standalone viewer mode), show the live viewer.
    return <LiveDataViewer />;
}

    