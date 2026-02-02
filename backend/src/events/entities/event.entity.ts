import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    OneToMany,
} from 'typeorm';
import { EventStatus } from '../../common/enums';
import { Club } from '../../clubs/entities/club.entity';
import { Registration } from './registration.entity';
import { EventRating } from './event-rating.entity';

@Entity('events')
export class Event {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int', name: 'club_id', nullable: false })
    clubId: number;

    @Column({ type: 'varchar', nullable: false })
    title: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'varchar', nullable: true })
    location: string;

    @Column({ type: 'timestamp', name: 'start_time', nullable: false })
    startTime: Date;

    @Column({ type: 'timestamp', name: 'end_time', nullable: false })
    endTime: Date;

    @Column({ type: 'int', nullable: true })
    capacity: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    price: number;

    @Column({ type: 'varchar', nullable: true, name: 'photo_url' })
    photoUrl: string;

    @Column({ type: 'json', nullable: true })
    sections: Array<{ title: string; description: string; imageUrl?: string }>;

    @Column({ type: 'enum', enum: EventStatus, nullable: false, default: EventStatus.DRAFT })
    status: EventStatus;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @ManyToOne(() => Club, (club) => club.events, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'club_id' })
    club: Club;

    @OneToMany(() => Registration, (registration) => registration.event)
    registrations: Registration[];

    @OneToMany(() => EventRating, (rating) => rating.event)
    ratings: EventRating[];
}
