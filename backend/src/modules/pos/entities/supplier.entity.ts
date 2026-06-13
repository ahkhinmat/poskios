import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'Suppliers' })
export class Supplier {
  @PrimaryGeneratedColumn({ name: 'Id' })
  id!: number;

  @Column({ name: 'Code', type: 'nvarchar', length: 50, nullable: true })
  code!: string | null;

  @Column({ name: 'Name', type: 'nvarchar', length: 150 })
  name!: string;

  @Column({ name: 'PhoneNumber', type: 'nvarchar', length: 30, nullable: true })
  phoneNumber!: string | null;

  @Column({ name: 'Address', type: 'nvarchar', length: 255, nullable: true })
  address!: string | null;

  @Column({ name: 'Notes', type: 'nvarchar', length: 500, nullable: true })
  notes!: string | null;

  @Column({ name: 'IsActive', type: 'bit' })
  isActive!: boolean;
}
