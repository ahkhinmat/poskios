import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'Categories' })
export class Category {
  @PrimaryGeneratedColumn({ name: 'Id' })
  id!: number;

  @Column({ name: 'Name', type: 'nvarchar', length: 150 })
  name!: string;

  @Column({ name: 'IsActive', type: 'bit' })
  isActive!: boolean;
}
