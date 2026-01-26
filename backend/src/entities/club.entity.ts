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

    @Column({ type: 'varchar', nullable: true, name: 'short_description' })
    shortDescription: string;

    @Column({ type: 'varchar', nullable: true, name: 'logo_url' })
    logoUrl: string;

    @Column({ type: 'text', nullable: true })
    about: string;

    @Column({ type: 'varchar', nullable: true, name: 'about_image_url' })
    aboutImageUrl: string;

    @Column({ type: 'jsonb', nullable: true })
    history: any;

    @Column({ type: 'jsonb', nullable: true })
    mission: any;

    @Column({ type: 'jsonb', nullable: true })
    activities: any;

    @Column({ type: 'jsonb', nullable: true })
    achievements: any;

    @Column({ type: 'jsonb', nullable: true, name: 'join_us' })
    joinUs: any;

    @Column({ type: 'jsonb', nullable: true })
    contact: any;

    @Column({ type: 'varchar', nullable: true, name: 'cover_image_url' })
    coverImageUrl: string;

    @Column({ type: 'int', nullable: true, name: 'owner_id' })
    ownerId: number;

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
