import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'Units' })
export class Unit {
  @PrimaryGeneratedColumn({ name: 'Id' })
  id!: number;

  @Column({ name: 'Name', type: 'nvarchar', length: 100 })
  name!: string;
}
