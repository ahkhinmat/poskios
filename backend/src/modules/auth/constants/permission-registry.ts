export type RegistryAction = {
  action: string;
  label: string;
  perm: string;
};

export type RegistryModule = {
  key: string;
  label: string;
  actions: RegistryAction[];
};

export const PERMISSION_REGISTRY: RegistryModule[] = [
  {
    key: 'sales',
    label: 'Bán hàng',
    actions: [
      { action: 'create', label: 'Tạo hóa đơn', perm: 'sales.create' },
      { action: 'cancel', label: 'Hủy hóa đơn', perm: 'sales.cancel' },
    ],
  },
  {
    key: 'returns',
    label: 'Trả hàng',
    actions: [
      { action: 'return', label: 'Lập phiếu trả', perm: 'sales.return' },
    ],
  },
  {
    key: 'purchase',
    label: 'Nhập hàng',
    actions: [
      { action: 'create', label: 'Tạo phiếu nhập', perm: 'purchase.create' },
      { action: 'complete', label: 'Hoàn thành nhập', perm: 'purchase.complete' },
    ],
  },
  {
    key: 'products',
    label: 'Danh mục',
    actions: [
      { action: 'view', label: 'Xem sản phẩm', perm: 'products.view' },
      { action: 'manage', label: 'Quản lý sản phẩm', perm: 'products.manage' },
      { action: 'import', label: 'Import sản phẩm', perm: 'products.import' },
      { action: 'view_category', label: 'Xem danh mục', perm: 'categories.view' },
      { action: 'manage_category', label: 'Quản lý danh mục', perm: 'categories.manage' },
      { action: 'view_unit', label: 'Xem đơn vị tính', perm: 'units.view' },
    ],
  },
  {
    key: 'dashboard',
    label: 'Dashboard',
    actions: [
      { action: 'view', label: 'Xem tổng quan', perm: 'overview.view' },
      { action: 'configure_loyalty', label: 'Cấu hình tích điểm', perm: 'loyalty.configure' },
    ],
  },
  {
    key: 'settings',
    label: 'Cài đặt',
    actions: [
      { action: 'manage', label: 'Quản lý cấu hình', perm: 'settings.manage' },
      { action: 'view_supplier', label: 'Xem nhà cung cấp', perm: 'suppliers.view' },
      { action: 'manage_supplier', label: 'Quản lý nhà cung cấp', perm: 'suppliers.manage' },
      { action: 'manage_roles', label: 'Quản lý vai trò', perm: 'roles.manage' },
      { action: 'manage_users', label: 'Quản lý người dùng', perm: 'users.manage' },
    ],
  },
];

export function buildPermissionConstants() {
  const PERMISSIONS: Record<string, string> = {};
  const PERMISSION_GROUPS: { label: string; permissions: string[] }[] = [];
  const PERMISSION_LABELS: Record<string, string> = {};

  for (const mod of PERMISSION_REGISTRY) {
    const perms = mod.actions.map((a) => a.perm);
    PERMISSION_GROUPS.push({ label: mod.label, permissions: perms });
    for (const a of mod.actions) {
      const key = a.perm.replace(/\./g, '_').toUpperCase();
      PERMISSIONS[key] = a.perm;
      PERMISSION_LABELS[a.perm] = a.label;
    }
  }

  return { PERMISSIONS, PERMISSION_GROUPS, PERMISSION_LABELS };
}
