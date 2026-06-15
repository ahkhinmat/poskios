export type RoleCode = 'STAFF' | 'MANAGER';

export type AuthenticatedUser = {
  id: number;
  username: string;
  fullName: string;
  roleCode: RoleCode;
};

export type AuthJwtPayload = {
  sub: number;
  username: string;
  fullName: string;
  roleCode: RoleCode;
};
