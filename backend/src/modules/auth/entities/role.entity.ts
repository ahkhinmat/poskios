import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { UserRole } from './user-role.entity';

@Entity({ name: 'Roles' })
export class Role {
  @PrimaryGeneratedColumn({ name: 'Id' })
  id!: number;

  @Column({ name: 'Code', type: 'nvarchar', length: 50 })
  code!: string;

  @Column({ name: 'Name', type: 'nvarchar', length: 100 })
  name!: string;

  @Column({ name: 'Description', type: 'nvarchar', length: 255, nullable: true })
  description!: string | null;

  @Column({ name: 'ParentId', type: 'int', nullable: true })
  parentId!: number | null;

  @ManyToOne(() => Role, { nullable: true })
  @JoinColumn({ name: 'ParentId' })
  parent!: Role | null;

  @OneToMany(() => Role, (role) => role.parent)
  children!: Role[];

  @Column({ name: 'IsActive', type: 'bit' })
  isActive!: boolean;

  @Column({ name: 'Permissions', type: 'nvarchar', length: 1000, nullable: true })
  permissions!: string | null;

  @Column({ name: 'CreatedAt', type: 'datetime2' })
  createdAt!: Date;

  @Column({ name: 'UpdatedAt', type: 'datetime2' })
  updatedAt!: Date;

  @OneToMany(() => UserRole, (userRole) => userRole.role)
  userRoles!: UserRole[];
}
