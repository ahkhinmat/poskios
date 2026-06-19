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
  SALES_CANCEL: 'sales.cancel',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const PERMISSION_GROUPS: { label: string; permissions: string[] }[] = [
  {
    label: 'Bán hàng',
    permissions: [PERMISSIONS.SALES_CREATE, PERMISSIONS.SALES_CANCEL],
  },
  {
    label: 'Trả hàng',
    permissions: [PERMISSIONS.SALES_RETURN],
  },
  {
    label: 'Nhập hàng',
    permissions: [PERMISSIONS.PURCHASE_CREATE, PERMISSIONS.PURCHASE_COMPLETE],
  },
  {
    label: 'Danh mục',
    permissions: [PERMISSIONS.PRODUCTS_VIEW, PERMISSIONS.PRODUCTS_MANAGE, PERMISSIONS.PRODUCTS_IMPORT, PERMISSIONS.CATEGORIES_VIEW, PERMISSIONS.CATEGORIES_MANAGE, PERMISSIONS.UNITS_VIEW],
  },
  {
    label: 'Dashboard',
    permissions: [PERMISSIONS.OVERVIEW_VIEW, PERMISSIONS.LOYALTY_CONFIGURE],
  },
  {
    label: 'Cài đặt',
    permissions: [PERMISSIONS.SETTINGS_MANAGE, PERMISSIONS.SUPPLIERS_VIEW, PERMISSIONS.SUPPLIERS_MANAGE],
  },
];

export const PERMISSION_LABELS: Record<string, string> = {
  [PERMISSIONS.PRODUCTS_VIEW]: 'Xem sản phẩm',
  [PERMISSIONS.PRODUCTS_MANAGE]: 'Quản lý sản phẩm',
  [PERMISSIONS.CATEGORIES_VIEW]: 'Xem danh mục',
  [PERMISSIONS.CATEGORIES_MANAGE]: 'Quản lý danh mục',
  [PERMISSIONS.UNITS_VIEW]: 'Xem đơn vị tính',
  [PERMISSIONS.SUPPLIERS_VIEW]: 'Xem nhà cung cấp',
  [PERMISSIONS.SUPPLIERS_MANAGE]: 'Quản lý nhà cung cấp',
  [PERMISSIONS.SALES_CREATE]: 'Tạo hóa đơn bán',
  [PERMISSIONS.SALES_RETURN]: 'Lập phiếu trả hàng',
  [PERMISSIONS.PURCHASE_CREATE]: 'Tạo phiếu nhập',
  [PERMISSIONS.PURCHASE_COMPLETE]: 'Hoàn thành phiếu nhập',
  [PERMISSIONS.OVERVIEW_VIEW]: 'Xem tổng quan',
  [PERMISSIONS.LOYALTY_CONFIGURE]: 'Cấu hình tích điểm',
  [PERMISSIONS.SETTINGS_MANAGE]: 'Quản lý cấu hình',
  [PERMISSIONS.PRODUCTS_IMPORT]: 'Import sản phẩm',
  [PERMISSIONS.SALES_CANCEL]: 'Hủy hóa đơn bán',
};
