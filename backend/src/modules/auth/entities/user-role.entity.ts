import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Role } from './role.entity';
import { User } from './user.entity';

@Entity({ name: 'UserRoles' })
export class UserRole {
  @PrimaryGeneratedColumn({ name: 'Id' })
  id!: number;

  @Column({ name: 'UserId', type: 'int' })
  userId!: number;

  @Column({ name: 'RoleId', type: 'int' })
  roleId!: number;

  @Column({ name: 'CreatedAt', type: 'datetime2' })
  createdAt!: Date;

  @ManyToOne(() => User, (user) => user.userRoles)
  @JoinColumn({ name: 'UserId' })
  user!: User;

  @ManyToOne(() => Role, (role) => role.userRoles)
  @JoinColumn({ name: 'RoleId' })
  role!: Role;
}
