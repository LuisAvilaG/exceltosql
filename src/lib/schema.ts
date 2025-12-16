export type SqlColumn = {
  name: keyof typeof usaSalesByRevenueCenterSchema;
  type: 'int' | 'datetime' | 'varchar(100)' | 'decimal(38,0)' | 'decimal(10,0)';
  isIdentity: boolean;
  isRequired: boolean;
  description: string;
};

export const usaSalesByRevenueCenterSchema = {
  Id: { type: 'int' as const, isIdentity: true, isRequired: false, description: 'ID auto-generado' },
  SalesDate: { type: 'datetime' as const, isIdentity: false, isRequired: true, description: 'Fecha de la venta' },
  MeraLocationId: { type: 'int' as const, isIdentity: false, isRequired: true, description: 'ID de la ubicación' },
  MeraRevenueCenterName: { type: 'varchar(100)' as const, isIdentity: false, isRequired: false, description: 'Nombre del centro de ingresos' },
  MeraAreaId: { type: 'int' as const, isIdentity: false, isRequired: false, description: 'ID del área' },
  Sales: { type: 'decimal(38,0)' as const, isIdentity: false, isRequired: false, description: 'Ventas totales' },
  Voids: { type: 'decimal(38,0)' as const, isIdentity: false, isRequired: false, description: 'Anulaciones' },
  Discounts: { type: 'decimal(38,0)' as const, isIdentity: false, isRequired: false, description: 'Descuentos' },
  PaxCount: { type: 'int' as const, isIdentity: false, isRequired: false, description: 'Número de comensales (pax)' },
  CheckCount: { type: 'int' as const, isIdentity: false, isRequired: false, description: 'Número de cheques' },
  Budget: { type: 'decimal(38,0)' as const, isIdentity: false, isRequired: false, description: 'Presupuesto' },
  MeraOrderType: { type: 'int' as const, isIdentity: false, isRequired: false, description: 'Tipo de orden' },
  Cost: { type: 'decimal(38,0)' as const, isIdentity: false, isRequired: false, description: 'Costo' },
  PAXBudget: { type: 'decimal(38,0)' as const, isIdentity: false, isRequired: false, description: 'Presupuesto de comensales' },
  Tax: { type: 'decimal(38,0)' as const, isIdentity: false, isRequired: false, description: 'Impuestos' },
  DiscountTypeSales: { type: 'decimal(10,0)' as const, isIdentity: false, isRequired: false, description: 'Descuento por tipo de venta' },
  DiscountTypeAdmOp: { type: 'decimal(10,0)' as const, isIdentity: false, isRequired: false, description: 'Descuento administrativo' },
  TotalOpenCheckTime: { type: 'decimal(38,0)' as const, isIdentity: false, isRequired: false, description: 'Tiempo total de cheque abierto' },
  MeraRevenueCenterId: { type: 'int' as const, isIdentity: false, isRequired: true, description: 'ID del centro de ingresos' },
} as const;

export const tableColumns: SqlColumn[] = Object.entries(usaSalesByRevenueCenterSchema).map(
  ([name, props]) => ({ name: name as keyof typeof usaSalesByRevenueCenterSchema, ...props })
);
