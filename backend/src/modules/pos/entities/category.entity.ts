import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'Categories' })
export class Category {
  @PrimaryGeneratedColumn({ name: 'Id' })
  id!: number;

  @Column({ name: 'Name', type: 'varchar', length: 150 })
  name!: string;

  @Column({ name: 'IsActive', type: 'boolean' })
  isActive!: boolean;
}
