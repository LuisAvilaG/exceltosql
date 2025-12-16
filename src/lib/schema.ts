
export type SqlColumn = {
  name: keyof typeof usaSalesByRevenueCenterSchema;
  type: 'int' | 'datetime' | 'varchar(100)' | 'decimal(38,0)' | 'decimal(10,0)';
  isIdentity: boolean;
  isRequired: boolean;
  description: string;
};

export const usaSalesByRevenueCenterSchema = {
  Id: { type: 'int' as const, isIdentity: true, isRequired: false, description: 'Auto-generated ID' },
  SalesDate: { type: 'datetime' as const, isIdentity: false, isRequired: true, description: 'Date of the sale' },
  MeraLocationId: { type: 'int' as const, isIdentity: false, isRequired: true, description: 'ID of the location' },
  MeraRevenueCenterName: { type: 'varchar(100)' as const, isIdentity: false, isRequired: false, description: 'Name of the revenue center' },
  MeraAreaId: { type: 'int' as const, isIdentity: false, isRequired: false, description: 'ID of the area' },
  Sales: { type: 'decimal(38,0)' as const, isIdentity: false, isRequired: false, description: 'Total sales' },
  Voids: { type: 'decimal(38,0)' as const, isIdentity: false, isRequired: false, description: 'Voided sales' },
  Discounts: { type: 'decimal(38,0)' as const, isIdentity: false, isRequired: false, description: 'Discounts' },
  PaxCount: { type: 'int' as const, isIdentity: false, isRequired: false, description: 'Number of guests (pax)' },
  CheckCount: { type: 'int' as const, isIdentity: false, isRequired: false, description: 'Number of checks' },
  Budget: { type: 'decimal(38,0)' as const, isIdentity: false, isRequired: false, description: 'Budget' },
  MeraOrderType: { type: 'int' as const, isIdentity: false, isRequired: false, description: 'Order type' },
  Cost: { type: 'decimal(38,0)' as const, isIdentity: false, isRequired: false, description: 'Cost of goods sold' },
  PAXBudget: { type: 'decimal(38,0)' as const, isIdentity: false, isRequired: false, description: 'Guest budget (pax)' },
  Tax: { type: 'decimal(38,0)' as const, isIdentity: false, isRequired: false, description: 'Taxes' },
  DiscountTypeSales: { type: 'decimal(10,0)' as const, isIdentity: false, isRequired: false, description: 'Discount by sales type' },
  DiscountTypeAdmOp: { type: 'decimal(10,0)' as const, isIdentity: false, isRequired: false, description: 'Administrative discount' },
  TotalOpenCheckTime: { type: 'decimal(38,0)' as const, isIdentity: false, isRequired: false, description: 'Total open check time' },
  MeraRevenueCenterId: { type: 'int' as const, isIdentity: false, isRequired: true, description: 'ID of the revenue center' },
} as const;

export const tableColumns: SqlColumn[] = Object.entries(usaSalesByRevenueCenterSchema).map(
  ([name, props]) => ({ name: name as keyof typeof usaSalesByRevenueCenterSchema, ...props })
);
