
export const tableName = 'REP_usaSalesByRevenueCenter';

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
  MeraRevenueCenterName: { type: 'varchar(100)' as const, isIdentity: false, isRequired: true, description: 'Name of the revenue center' },
  MeraAreaId: { type: 'int' as const, isIdentity: false, isRequired: false, description: 'ID of the area' },
  Sales: { type: 'decimal(38,0)' as const, isIdentity: false, isRequired: true, description: 'Total sales amount' },
  Voids: { type: 'decimal(38,0)' as const, isIdentity: false, isRequired: false, description: 'Total voided amount' },
  Discounts: { type: 'decimal(38,0)' as const, isIdentity: false, isRequired: false, description: 'Total discount amount' },
  PaxCount: { type: 'int' as const, isIdentity: false, isRequired: false, description: 'Number of guests (pax)' },
  CheckCount: { type: 'int' as const, isIdentity: false, isRequired: false, description: 'Number of checks/transactions' },
  Budget: { type: 'decimal(38,0)' as const, isIdentity: false, isRequired: false, description: 'Budgeted sales amount' },
  MeraOrderType: { type: 'int' as const, isIdentity: false, isRequired: false, description: 'ID for the order type' },
  Cost: { type: 'decimal(38,0)' as const, isIdentity: false, isRequired: false, description: 'Cost of goods sold' },
  PAXBudget: { type: 'decimal(38,0)' as const, isIdentity: false, isRequired: false, description: 'Budgeted guest count (pax)' },
  Tax: { type: 'decimal(38,0)' as const, isIdentity: false, isRequired: false, description: 'Total tax amount' },
  DiscountTypeSales: { type: 'decimal(10,0)' as const, isIdentity: false, isRequired: false, description: 'Discount amount by sales type' },
  DiscountTypeAdmOp: { type: 'decimal(10,0)' as const, isIdentity: false, isRequired: false, description: 'Administrative or operational discount' },
  TotalOpenCheckTime: { type: 'decimal(38,0)' as const, isIdentity: false, isRequired: false, description: 'Total time checks were open, in seconds' },
  MeraRevenueCenterId: { type: 'int' as const, isIdentity: false, isRequired: true, description: 'ID of the revenue center' },
} as const;

export const tableColumns: SqlColumn[] = Object.entries(usaSalesByRevenueCenterSchema).map(
  ([name, props]) => ({ name: name as keyof typeof usaSalesByRevenueCenterSchema, ...props })
);
