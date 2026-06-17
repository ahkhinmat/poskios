import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'Roles' })
export class Role {
  @PrimaryGeneratedColumn({ name: 'Id' })
  id!: number;

  @Column({ name: 'Code', type: 'varchar', length: 50 })
  code!: string;

  @Column({ name: 'Name', type: 'varchar', length: 100 })
  name!: string;

  @Column({ name: 'Description', type: 'varchar', length: 255, nullable: true })
  description!: string | null;

  @Column({ name: 'IsActive', type: 'boolean' })
  isActive!: boolean;

  @Column({ name: 'Permissions', type: 'varchar', length: 1000, nullable: true })
  permissions!: string | null;

  @Column({ name: 'CreatedAt', type: 'timestamp' })
  createdAt!: Date;

  @Column({ name: 'UpdatedAt', type: 'timestamp' })
  updatedAt!: Date;
}
