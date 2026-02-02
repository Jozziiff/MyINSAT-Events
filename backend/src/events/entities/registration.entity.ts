import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToOne,
    JoinColumn,
} from 'typeorm';
import { RegistrationStatus } from '../../common/enums';
import { User } from '../../users/entities/user.entity';
import { Event } from './event.entity';
import { EventRating } from './event-rating.entity';

@Entity('registrations')
export class Registration {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int', name: 'user_id', nullable: false })
    userId: number;

    @Column({ type: 'int', name: 'event_id', nullable: false })
    eventId: number;

    @Column({ type: 'enum', enum: RegistrationStatus, nullable: false, default: RegistrationStatus.INTERESTED })
    status: RegistrationStatus;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @ManyToOne(() => User, (user) => user.registrations, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => Event, (event) => event.registrations, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'event_id' })
    event: Event;

    @OneToOne(() => EventRating, (rating) => rating.registration, { nullable: true })
    userRating?: EventRating;
}
