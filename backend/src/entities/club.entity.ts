import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
} from 'typeorm';
import { ClubManager } from './club-manager.entity';
import { Event } from './event.entity';
import { ClubFollower } from './club-follower.entity';

@Entity('clubs')
export class Club {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', unique: true, nullable: false })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'text', name: 'payment_info', nullable: true })
    paymentInfo: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @OneToMany(() => ClubManager, (clubManager) => clubManager.club)
    managers: ClubManager[];

    @OneToMany(() => Event, (event) => event.club)
    events: Event[];

    @OneToMany(() => ClubFollower, (follower) => follower.club)
    followers: ClubFollower[];
}
