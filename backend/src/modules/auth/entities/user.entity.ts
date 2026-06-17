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

  @Column({ name: 'Username', type: 'varchar', length: 100 })
  username!: string;

  @Column({ name: 'PasswordHash', type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ name: 'FullName', type: 'varchar', length: 150 })
  fullName!: string;

  @Column({ name: 'PhoneNumber', type: 'varchar', length: 30, nullable: true })
  phoneNumber!: string | null;

  @Column({ name: 'Email', type: 'varchar', length: 150, nullable: true })
  email!: string | null;

  @Column({ name: 'LastLoginAt', type: 'timestamp', nullable: true })
  lastLoginAt!: Date | null;

  @Column({ name: 'IsActive', type: 'boolean' })
  isActive!: boolean;

  @Column({ name: 'CreatedAt', type: 'timestamp' })
  createdAt!: Date;

  @Column({ name: 'UpdatedAt', type: 'timestamp' })
  updatedAt!: Date;

  @ManyToOne(() => Role, { eager: false })
  @JoinColumn({ name: 'RoleId' })
  role!: Role;
}
