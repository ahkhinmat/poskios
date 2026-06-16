export const PERMISSIONS = {
  PRODUCTS_VIEW: 'products.view',
  PRODUCTS_MANAGE: 'products.manage',
  CATEGORIES_VIEW: 'categories.view',
  CATEGORIES_MANAGE: 'categories.manage',
  UNITS_VIEW: 'units.view',
  SUPPLIERS_VIEW: 'suppliers.view',
  SUPPLIERS_MANAGE: 'suppliers.manage',
  SALES_CREATE: 'sales.create',
  SALES_RETURN: 'sales.return',
  PURCHASE_CREATE: 'purchase.create',
  PURCHASE_COMPLETE: 'purchase.complete',
  OVERVIEW_VIEW: 'overview.view',
  LOYALTY_CONFIGURE: 'loyalty.configure',
  SETTINGS_MANAGE: 'settings.manage',
  PRODUCTS_IMPORT: 'products.import',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
