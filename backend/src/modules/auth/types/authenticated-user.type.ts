import type { Permission } from '../constants/permissions';

export type RoleCode = 'STAFF' | 'MANAGER';

export type AuthenticatedUser = {
  id: number;
  username: string;
  fullName: string;
  roleCode: RoleCode;
  permissions: Permission[];
};

export type AuthJwtPayload = {
  sub: number;
  username: string;
  fullName: string;
  roleCode: RoleCode;
  permissions: Permission[];
};
