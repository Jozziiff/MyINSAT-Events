import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToOne,
    JoinColumn,
    Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Event } from './event.entity';
import { Registration } from './registration.entity';

@Entity('event_ratings')
@Unique(['userId', 'eventId']) // One rating per user per event
export class EventRating {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int', name: 'user_id', nullable: false })
    userId: number;

    @Column({ type: 'int', name: 'event_id', nullable: false })
    eventId: number;

    @Column({ type: 'int', nullable: false })
    rating: number;

    @Column({ type: 'text', nullable: true })
    comment: string | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => Event, (event) => event.ratings, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'event_id' })
    event: Event;

    @OneToOne(() => Registration, (registration) => registration.userRating, { nullable: true })
    @JoinColumn([
        { name: 'user_id', referencedColumnName: 'userId' },
        { name: 'event_id', referencedColumnName: 'eventId' }
    ])
    registration?: Registration;
}
