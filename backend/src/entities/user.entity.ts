import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
} from 'typeorm';
import { UserRole } from '../common/enums';
import { ClubManager } from './club-manager.entity';
import { Registration } from './registration.entity';
import { ClubFollower } from './club-follower.entity';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', unique: true, nullable: false })
    email: string;

    @Column({ type: 'varchar', name: 'password_hash', nullable: false })
    passwordHash: string;

    @Column({ type: 'varchar', name: 'full_name', nullable: true })
    fullName: string;

    @Column({ type: 'varchar', name: 'avatar_url', nullable: true })
    avatarUrl: string;

    @Column({ type: 'enum', enum: UserRole, nullable: false })
    role: UserRole;

    @Column({ type: 'boolean', name: 'email_verified', default: false })
    emailVerified: boolean;

    @Column({ type: 'boolean', name: 'is_active', default: true })
    isActive: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @OneToMany(() => ClubManager, (clubManager) => clubManager.user)
    managedClubs: ClubManager[];

    @OneToMany(() => Registration, (registration) => registration.user)
    registrations: Registration[];

    @OneToMany(() => ClubFollower, (follower) => follower.user)
    followedClubs: ClubFollower[];
}
