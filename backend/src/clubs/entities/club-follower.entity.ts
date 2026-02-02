import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Club } from './club.entity';

@Entity('club_followers')
export class ClubFollower {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int', name: 'user_id', nullable: false })
    userId: number;

    @Column({ type: 'int', name: 'club_id', nullable: false })
    clubId: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @ManyToOne(() => User, (user) => user.followedClubs, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => Club, (club) => club.followers, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'club_id' })
    club: Club;
}
