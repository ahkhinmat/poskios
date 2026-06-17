import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'Suppliers' })
export class Supplier {
  @PrimaryGeneratedColumn({ name: 'Id' })
  id!: number;

  @Column({ name: 'Code', type: 'varchar', length: 50, nullable: true })
  code!: string | null;

  @Column({ name: 'Name', type: 'varchar', length: 150 })
  name!: string;

  @Column({ name: 'PhoneNumber', type: 'varchar', length: 30, nullable: true })
  phoneNumber!: string | null;

  @Column({ name: 'Address', type: 'varchar', length: 255, nullable: true })
  address!: string | null;

  @Column({ name: 'Notes', type: 'varchar', length: 500, nullable: true })
  notes!: string | null;

  @Column({ name: 'IsActive', type: 'boolean' })
  isActive!: boolean;
}
