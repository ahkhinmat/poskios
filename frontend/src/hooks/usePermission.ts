import { useMemo } from 'react';
import { LANG } from '../lang';
import { useAuth } from '../auth-context';
import type { Permission } from '../permissions';

export type PermissionCheck =
  | Permission
  | { permission: Permission; denyReason?: string };

export function usePermission(check: PermissionCheck) {
  const { user } = useAuth();

  const result = useMemo(() => {
    const perm = typeof check === 'string' ? check : check.permission;
    const denyReason =
      typeof check === 'string' ? undefined : check.denyReason;
    const has = user?.permissions?.includes(perm) ?? false;

    return {
      can: has,
      reason: has ? undefined : (denyReason ?? LANG.permissionDenied),
    };
  }, [check, user?.permissions]);

  return result;
}
