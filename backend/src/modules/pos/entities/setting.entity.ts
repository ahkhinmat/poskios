import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'Settings' })
export class Setting {
  @PrimaryGeneratedColumn({ name: 'Id' })
  id!: number;

  @Column({ name: 'StoreName', type: 'nvarchar', length: 150 })
  storeName!: string;

  @Column({ name: 'StoreAddress', type: 'nvarchar', length: 255, nullable: true })
  storeAddress!: string | null;

  @Column({ name: 'StorePhoneNumber', type: 'nvarchar', length: 30, nullable: true })
  storePhoneNumber!: string | null;

  @Column({ name: 'ReceiptHeader', type: 'nvarchar', length: 500, nullable: true })
  receiptHeader!: string | null;

  @Column({ name: 'ReceiptFooter', type: 'nvarchar', length: 500, nullable: true })
  receiptFooter!: string | null;
}
