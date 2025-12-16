export const mockExcelData = [
    { "SalesDate": "2024-07-20", "MeraLocationId": "101", "MeraRevenueCenterName": "Main Restaurant", "Sales": "1,500.50", "PaxCount": "50", "MeraRevenueCenterId": "3" },
    { "SalesDate": "2024-07-20", "MeraLocationId": "101", "MeraRevenueCenterName": "Terrace Bar", "Sales": "800.00", "PaxCount": "30", "MeraRevenueCenterId": "4" },
    { "SalesDate": "2024-07-21", "MeraLocationId": "102", "MeraRevenueCenterName": "Coffee Shop", "Sales": null, "PaxCount": "15", "MeraRevenueCenterId": "5" },
    { "SalesDate": "Invalid Date", "MeraLocationId": "102", "MeraRevenueCenterName": "Room Service", "Sales": "300.25", "PaxCount": "10", "MeraRevenueCenterId": "6" },
    { "SalesDate": "2024-07-21", "MeraLocationId": "ABC", "MeraRevenueCenterName": "Special Events with a very long name that should be truncated to fit into the destination database", "Sales": "$5,000", "PaxCount": "100", "MeraRevenueCenterId": "7" },
    { "SalesDate": "2024-07-22", "MeraLocationId": "103", "MeraRevenueCenterName": "Poolside", "Sales": "1200", "PaxCount": "45", "MeraRevenueCenterId": "8" },
    { "SalesDate": "2024-07-22", "MeraLocationId": "103", "MeraRevenueCenterName": "Gym", "Sales": "50", "PaxCount": "5", "MeraRevenueCenterId": "9" },
];

export const mockExcelHeaders = Object.keys(mockExcelData[0]);

export const mockJobHistory = [
    { id: '1', fileName: 'ventas_julio.xlsx', date: new Date('2024-07-19T10:30:00Z'), user: 'admin', strategy: 'Upsert', result: 'Completed with 5 errors', totalRows: 1000, inserted: 995, skipped: 0, errors: 5 },
    { id: '2', fileName: 'ventas_junio_final.xlsx', date: new Date('2024-06-30T17:00:00Z'), user: 'admin', strategy: 'Insert only', result: 'Completed', totalRows: 5280, inserted: 5280, skipped: 0, errors: 0 },
    { id: '3', fileName: 'ajuste_q2.xlsx', date: new Date('2024-06-15T11:00:00Z'), user: 'guest', strategy: 'Skip duplicates', result: 'Connection failed', totalRows: 250, inserted: 0, skipped: 0, errors: 250 },
];
