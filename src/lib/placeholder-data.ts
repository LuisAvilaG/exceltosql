export const mockExcelData = [
    { "FECHA VENTA": "2024-07-20", "ID Ubicacion": "101", "Centro de Ingresos": "Restaurante Principal", "Ventas": "1,500.50", "Clientes": "50", "ID Centro Ingreso": "3" },
    { "FECHA VENTA": "2024-07-20", "ID Ubicacion": "101", "Centro de Ingresos": "Bar Terraza", "Ventas": "800.00", "Clientes": "30", "ID Centro Ingreso": "4" },
    { "FECHA VENTA": "2024-07-21", "ID Ubicacion": "102", "Centro de Ingresos": "Cafetería", "Ventas": null, "Clientes": "15", "ID Centro Ingreso": "5" },
    { "FECHA VENTA": "Invalid Date", "ID Ubicacion": "102", "Centro de Ingresos": "Room Service", "Ventas": "300.25", "Clientes": "10", "ID Centro Ingreso": "6" },
    { "FECHA VENTA": "2024-07-21", "ID Ubicacion": "ABC", "Centro de Ingresos": "Eventos Especiales Larguísimo Nombre que debe ser truncado para que quepa en la base de datos de destino", "Ventas": "$5,000", "Clientes": "100", "ID Centro Ingreso": "7" },
    { "FECHA VENTA": "2024-07-22", "ID Ubicacion": "103", "Centro de Ingresos": "Piscina", "Ventas": "1200", "Clientes": "45", "ID Centro Ingreso": "8" },
    { "FECHA VENTA": "2024-07-22", "ID Ubicacion": "103", "Centro de Ingresos": "Gimnasio", "Ventas": "50", "Clientes": "5", "ID Centro Ingreso": "9" },
];

export const mockExcelHeaders = Object.keys(mockExcelData[0]);

export const mockJobHistory = [
    { id: '1', fileName: 'ventas_julio.xlsx', date: new Date('2024-07-19T10:30:00Z'), user: 'admin', strategy: 'Upsert', result: 'Completado con 5 errores', totalRows: 1000, inserted: 995, skipped: 0, errors: 5 },
    { id: '2', fileName: 'ventas_junio_final.xlsx', date: new Date('2024-06-30T17:00:00Z'), user: 'admin', strategy: 'Insert only', result: 'Completado', totalRows: 5280, inserted: 5280, skipped: 0, errors: 0 },
    { id: '3', fileName: 'ajuste_q2.xlsx', date: new Date('2024-06-15T11:00:00Z'), user: 'guest', strategy: 'Skip duplicates', result: 'Fallo en la conexión', totalRows: 250, inserted: 0, skipped: 0, errors: 250 },
];
