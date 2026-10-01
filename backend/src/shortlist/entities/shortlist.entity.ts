import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Unique, Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('shortlists')
@Unique(['userId', 'shortlistedId'])
export class Shortlist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  userId: string;

  @Index()
  @Column()
  shortlistedId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shortlistedId' })
  shortlisted: User;

  @CreateDateColumn()
  createdAt: Date;
}
