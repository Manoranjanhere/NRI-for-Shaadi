import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique, Index,
} from 'typeorm';
import { User } from './user.entity';

/** One row per viewer → viewed pair; viewedAt is bumped on every repeat visit. */
@Entity('profile_views')
@Unique(['viewerId', 'viewedId'])
export class ProfileView {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  viewerId: string;

  @Index()
  @Column()
  viewedId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'viewerId' })
  viewer: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'viewedId' })
  viewed: User;

  @Column({ type: 'timestamp', default: () => 'now()' })
  viewedAt: Date;
}
