import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Club } from './club.entity';

@Entity('club_managers')
@Unique(['userId', 'clubId'])
export class ClubManager {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int', name: 'user_id', nullable: false })
    userId: number;

    @Column({ type: 'int', name: 'club_id', nullable: false })
    clubId: number;

    @ManyToOne(() => User, (user) => user.managedClubs, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => Club, (club) => club.managers, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'club_id' })
    club: Club;
}
