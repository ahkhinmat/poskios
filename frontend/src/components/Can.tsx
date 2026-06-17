import type { ReactNode } from 'react';
import { Tooltip } from 'antd';
import { usePermission } from '../hooks/usePermission';
import type { PermissionCheck } from '../hooks/usePermission';

type Props = {
  check: PermissionCheck;
  children: ReactNode;
  fallback?: ReactNode;
  disabled?: boolean;
};

/**
 * Wraps UI that requires a permission.
 * - mode='hide' (default): ẩn nếu không có quyền
 * - mode='disable': render children với tooltip lý do, children tự xử lý disabled style
 */
export function Can({ check, children, fallback = null, disabled = false }: Props) {
  const { can, reason } = usePermission(check);

  if (can && !disabled) {
    return <>{children}</>;
  }

  if (can && disabled) {
    return <Tooltip title={reason}>{children}</Tooltip>;
  }

  if (fallback !== null) {
    return <>{fallback}</>;
  }

  return null;
}
