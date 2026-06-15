import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Role } from './role.entity';

@Entity({ name: 'Users' })
export class User {
  @PrimaryGeneratedColumn({ name: 'Id' })
  id!: number;

  @Column({ name: 'RoleId', type: 'int' })
  roleId!: number;

  @Column({ name: 'Username', type: 'nvarchar', length: 100 })
  username!: string;

  @Column({ name: 'PasswordHash', type: 'nvarchar', length: 255 })
  passwordHash!: string;

  @Column({ name: 'FullName', type: 'nvarchar', length: 150 })
  fullName!: string;

  @Column({ name: 'PhoneNumber', type: 'nvarchar', length: 30, nullable: true })
  phoneNumber!: string | null;

  @Column({ name: 'Email', type: 'nvarchar', length: 150, nullable: true })
  email!: string | null;

  @Column({ name: 'LastLoginAt', type: 'datetime2', nullable: true })
  lastLoginAt!: Date | null;

  @Column({ name: 'IsActive', type: 'bit' })
  isActive!: boolean;

  @Column({ name: 'CreatedAt', type: 'datetime2' })
  createdAt!: Date;

  @Column({ name: 'UpdatedAt', type: 'datetime2' })
  updatedAt!: Date;

  @ManyToOne(() => Role, { eager: false })
  @JoinColumn({ name: 'RoleId' })
  role!: Role;
}
