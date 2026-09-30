
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
import { RefreshCw, Search, SlidersHorizontal, Loader2, CalendarIcon, ArrowLeft, Package, CheckCircle, AlertTriangle, Trash2, ChevronsUpDown } from 'lucide-react';
import { useDataContext } from '@/context/data-context';
import { Input } from '../ui/input';
import { tableColumns } from '@/lib/schema';
import type { ExcelData } from '@/lib/types';
import { viewData } from '@/ai/flows/view-data-flow';
import { deleteData } from '@/ai/flows/delete-data-flow';
import { getFilterOptions } from '@/ai/flows/filter-options-flow';
import { Checkbox } from '../ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Label } from '../ui/label';

const ROWS_PER_PAGE = 50;

// <input type="date"> gives 'yyyy-MM-dd'; build a local Date so format() round-trips without timezone shifts.
const parseDateInput = (value: string): Date | undefined => {
    if (!value) return undefined;
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
};

const filterableColumns = ['MeraLocationId', 'MeraRevenueCenterName', 'MeraAreaId'];

type Filters = {
    [key: string]: any;
    SalesDate: {
        startDate: Date | undefined;
        endDate: Date | undefined;
    }
}

function DatePickerField({ id, value, onChange, placeholder, minDate, maxDate }: {
    id: string;
    value: Date | undefined;
    onChange: (date: Date | undefined) => void;
    placeholder: string;
    minDate?: Date;
    maxDate?: Date;
}) {
    const [open, setOpen] = useState(false);
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button id={id} variant="outline" className={cn('w-full justify-start text-left font-normal', !value && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {value ? format(value, 'LLL dd, yyyy') : <span>{placeholder}</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 shadow-lg" align="start">
                <Calendar
                    mode="single"
                    selected={value}
                    defaultMonth={value ?? maxDate ?? minDate}
                    onSelect={(d) => { onChange(d); setOpen(false); }}
                    disabled={[...(minDate ? [{ before: minDate }] : []), ...(maxDate ? [{ after: maxDate }] : [])]}
                />
                {value && (
                    <div className="border-t p-2">
                        <Button variant="ghost" size="sm" className="w-full" onClick={() => { onChange(undefined); setOpen(false); }}>Clear date</Button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}

function MultiSelectField({ id, label, options, value, onChange }: {
    id: string;
    label: string;
    options: (string | number)[];
    value: string[];
    onChange: (values: string[]) => void;
}) {
    const [search, setSearch] = useState('');
    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        return options.filter(o => !q || String(o).toLowerCase().includes(q));
    }, [options, search]);
    const toggle = (opt: string) => onChange(value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt]);

    return (
        <Popover onOpenChange={(open) => { if (!open) setSearch(''); }}>
            <PopoverTrigger asChild>
                <Button id={id} variant="outline" className="w-full justify-between font-normal">
                    <span className={cn('truncate', value.length === 0 && 'text-muted-foreground')}>
                        {value.length === 0 ? 'All' : value.length === 1 ? value[0] : `${value.length} selected`}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
                <div className="p-2 border-b">
                    <Input autoFocus placeholder={`Search ${label}...`} value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <div className="flex items-center justify-between px-3 py-1.5 text-xs text-muted-foreground">
                    <span>{value.length} selected · {visible.length} shown</span>
                    <div className="flex gap-2">
                        <button type="button" className="hover:text-foreground underline" onClick={() => onChange(Array.from(new Set([...value, ...visible.map(String)])))}>Select shown</button>
                        <button type="button" className="hover:text-foreground underline" onClick={() => onChange([])}>Clear</button>
                    </div>
                </div>
                <div className="max-h-60 overflow-auto px-1 pb-1">
                    {visible.length === 0 && <p className="px-3 py-4 text-center text-sm text-muted-foreground">No options.</p>}
                    {visible.map(opt => {
                        const o = String(opt);
                        return (
                            <label key={o} className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent/50">
                                <Checkbox checked={value.includes(o)} onCheckedChange={() => toggle(o)} />
                                <span className="truncate">{o}</span>
                            </label>
                        );
                    })}
                </div>
            </PopoverContent>
        </Popover>
    );
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
  
    const { toast } = useToast();
    const [filterOptions, setFilterOptions] = useState<Record<string, (string | number)[]>>({});
    const loadFilterOptions = useCallback(async () => {
      try {
        setFilterOptions((await getFilterOptions()).options);
      } catch (e) {
        console.error('Failed to load filter options:', e);
      }
    }, []);
    useEffect(() => { loadFilterOptions(); }, [loadFilterOptions]);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [deleteTarget, setDeleteTarget] = useState<'selected' | 'filtered' | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Filters/date range in the shape the server flows expect. Always built from the APPLIED filters,
    // so deletes affect exactly what the user sees in the table.
    const appliedQuery = useMemo(() => {
      const sd = appliedFilters.SalesDate;
      const dateRange = sd && (sd.startDate || sd.endDate)
        ? {
            startDate: sd.startDate ? format(sd.startDate, 'yyyy-MM-dd') : undefined,
            endDate: sd.endDate ? format(sd.endDate, 'yyyy-MM-dd') : undefined,
          }
        : undefined;
      const filters = Object.fromEntries(
        Object.entries(appliedFilters).filter(([key, value]) => key !== 'SalesDate' && value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && value.length === 0))
      );
      return { filters, dateRange };
    }, [appliedFilters]);
    const hasActiveFilters = Object.keys(appliedQuery.filters).length > 0 || !!appliedQuery.dateRange;

    const fetchAndSetData = useCallback(async () => {
      setIsLoading(true);

      const viewDataInput = {
        page: currentPage,
        rowsPerPage: ROWS_PER_PAGE,
        filters: appliedQuery.filters,
        dateRange: appliedQuery.dateRange,
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
    }, [currentPage, appliedQuery]);
  
    useEffect(() => {
      fetchAndSetData();
    }, [fetchAndSetData]);
  
    // Selection is per-page; clear it whenever the visible rows change.
    useEffect(() => {
      setSelectedIds(new Set());
    }, [data]);

    const pageIds = data.map(r => r.Id as number).filter(id => typeof id === 'number');
    const allOnPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));

    const toggleRow = (id: number, checked: boolean) => {
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (checked) next.add(id); else next.delete(id);
        return next;
      });
    };

    const toggleAllOnPage = (checked: boolean) => {
      setSelectedIds(checked ? new Set(pageIds) : new Set());
    };

    const handleConfirmDelete = async () => {
      if (!deleteTarget) return;
      setIsDeleting(true);
      try {
        const result = deleteTarget === 'selected'
          ? await deleteData({ mode: 'ids', ids: Array.from(selectedIds) })
          : await deleteData({ mode: 'filter', ...appliedQuery, expectedCount: totalCount });
        if (result.success) {
          toast({ title: 'Rows deleted', description: `${result.deleted} row(s) were deleted.` });
          setCurrentPage(1);
          await Promise.all([fetchAndSetData(), loadFilterOptions()]);
        } else {
          toast({ variant: 'destructive', title: 'Delete failed', description: result.error || 'Unknown error.' });
        }
      } catch (e: any) {
        toast({ variant: 'destructive', title: 'Delete failed', description: e.message || 'Unknown error.' });
      } finally {
        setIsDeleting(false);
        setDeleteTarget(null);
      }
    };

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
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4">
                                <div className="space-y-2">
                                    <Label htmlFor="filter-date-from">Sales Date From</Label>
                                    <DatePickerField
                                        id="filter-date-from"
                                        value={filters.SalesDate?.startDate}
                                        placeholder="Pick a date"
                                        maxDate={filters.SalesDate?.endDate}
                                        onChange={(d) => handleFilterChange('SalesDate', { ...filters.SalesDate, startDate: d })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="filter-date-to">Sales Date To</Label>
                                    <DatePickerField
                                        id="filter-date-to"
                                        value={filters.SalesDate?.endDate}
                                        placeholder="Pick a date"
                                        minDate={filters.SalesDate?.startDate}
                                        onChange={(d) => handleFilterChange('SalesDate', { ...filters.SalesDate, endDate: d })}
                                    />
                                </div>
                                
                                {filterableColumns.map(colName => (
                                    <div key={colName} className="space-y-2 min-w-0">
                                        <Label htmlFor={`filter-${colName}`} className="block truncate">{colName}</Label>
                                        <MultiSelectField
                                            id={`filter-${colName}`}
                                            label={colName}
                                            options={filterOptions[colName] ?? []}
                                            value={Array.isArray(filters[colName]) ? filters[colName] : []}
                                            onChange={(values) => handleFilterChange(colName, values)}
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
                
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <span className="text-sm text-muted-foreground">
                        {selectedIds.size > 0 ? `${selectedIds.size} selected` : `${totalCount} row(s)${hasActiveFilters ? ' match the filters' : ''}`}
                    </span>
                    <div className="flex gap-2">
                        <Button variant="destructive" size="sm" disabled={selectedIds.size === 0 || isLoading || isDeleting} onClick={() => setDeleteTarget('selected')}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete selected
                        </Button>
                        <Button variant="outline" size="sm" className="text-destructive" disabled={!hasActiveFilters || totalCount === 0 || isLoading || isDeleting} onClick={() => setDeleteTarget('filtered')} title={hasActiveFilters ? undefined : 'Apply at least one filter to delete by filter'}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete all {hasActiveFilters ? totalCount : ''} filtered
                        </Button>
                    </div>
                </div>
                <div className="min-h-[400px] overflow-auto border rounded-lg relative">
                    {isLoading && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    )}
                    <Table>
                        <TableHeader className="sticky top-0 bg-card">
                        <TableRow>
                            <TableHead className="w-10">
                                <Checkbox aria-label="Select all rows on this page" checked={allOnPageSelected} onCheckedChange={(c) => toggleAllOnPage(!!c)} disabled={pageIds.length === 0} />
                            </TableHead>
                            {tableColumns.map((header) => <TableHead key={header.name}>{header.name}</TableHead>)}
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {data.length > 0 ? data.map((row, i) => {
                            const fingerprint = getRowFingerprint(row);
                            const isRecent = lastRunFingerprints.has(fingerprint);
                            return (
                                <TableRow key={i} data-state={selectedIds.has(row.Id) ? 'selected' : undefined} className={isRecent ? 'bg-green-100 dark:bg-green-900/20 hover:bg-green-200/80 dark:hover:bg-green-900/30' : ''}>
                                    <TableCell>
                                        <Checkbox aria-label={`Select row ${row.Id}`} checked={selectedIds.has(row.Id)} onCheckedChange={(c) => toggleRow(row.Id, !!c)} />
                                    </TableCell>
                                    {tableColumns.map(col => <TableCell key={col.name}>{String(row[col.name] ?? '')}</TableCell>)}
                                </TableRow>
                            );
                        }) : (
                            !isLoading && <TableRow><TableCell colSpan={tableColumns.length + 1} className="text-center">No data found.</TableCell></TableRow>
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
            <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open && !isDeleting) setDeleteTarget(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {deleteTarget === 'selected' ? selectedIds.size : totalCount} row(s)?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteTarget === 'selected'
                                ? 'The selected rows will be permanently deleted from the database.'
                                : 'Every row matching the current filters (across all pages) will be permanently deleted from the database.'}
                            {' '}This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={isDeleting}
                            onClick={(e) => { e.preventDefault(); handleConfirmDelete(); }}
                        >
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
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

    