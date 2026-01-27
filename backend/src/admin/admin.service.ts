import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Club } from '../entities/club.entity';
import { User } from '../entities/user.entity';
import { ClubManager } from '../entities/club-manager.entity';
import { ClubStatus } from '../common/enums/club-status.enum';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class AdminService {
    constructor(
        @InjectRepository(Club)
        private clubRepository: Repository<Club>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(ClubManager)
        private clubManagerRepository: Repository<ClubManager>,
    ) { }

    // Get all pending clubs
    async getPendingClubs(): Promise<any[]> {
        const clubs = await this.clubRepository
            .createQueryBuilder('club')
            .leftJoinAndSelect('club.managers', 'clubManager')
            .leftJoinAndSelect('clubManager.user', 'user')
            .where('club.status = :status', { status: ClubStatus.PENDING })
            .orderBy('club.createdAt', 'DESC')
            .getMany();

        return clubs.map(club => {
            const manager = club.managers?.[0]; // Get first manager (creator)
            const user = manager?.user;

            return {
                id: club.id,
                name: club.name,
                shortDescription: club.shortDescription,
                logoUrl: club.logoUrl,
                createdAt: club.createdAt,
                status: club.status,
                owner: user ? {
                    id: user.id,
                    fullName: user.fullName || 'Unknown',
                    email: user.email || 'Unknown',
                } : null,
            };
        });
    }

    // Get all clubs filtered by status
    async getAllClubs(status?: ClubStatus): Promise<any[]> {
        let query = this.clubRepository
            .createQueryBuilder('club')
            .leftJoinAndSelect('club.managers', 'clubManager')
            .leftJoinAndSelect('clubManager.user', 'user')
            .orderBy('club.createdAt', 'DESC');

        if (status) {
            query = query.where('club.status = :status', { status });
        }

        const clubs = await query.getMany();

        return clubs.map(club => {
            const manager = club.managers?.[0];
            const user = manager?.user;

            return {
                id: club.id,
                name: club.name,
                shortDescription: club.shortDescription,
                logoUrl: club.logoUrl,
                createdAt: club.createdAt,
                status: club.status,
                owner: user ? {
                    id: user.id,
                    fullName: user.fullName || 'Unknown',
                    email: user.email || 'Unknown',
                } : null,
            };
        });
    }

    // Approve a club
    async approveClub(clubId: number): Promise<Club> {
        const club = await this.clubRepository.findOne({
            where: { id: clubId },
            relations: ['managers', 'managers.user'],
        });

        if (!club) {
            throw new NotFoundException('Club not found');
        }

        if (club.status !== ClubStatus.PENDING) {
            throw new Error('Club is not in pending status');
        }

        const manager = club.managers?.[0];
        if (!manager || !manager.user) {
            throw new Error('Club has no manager/creator');
        }

        // Update club status to APPROVED
        club.status = ClubStatus.APPROVED;
        await this.clubRepository.save(club);

        // Update user role to MANAGER (if not already ADMIN)
        // Note: club_managers record already exists from creation
        const user = manager.user;
        if (user.role !== UserRole.ADMIN) {
            user.role = UserRole.MANAGER;
            await this.userRepository.save(user);
        }

        return club;
    }

    // Reject a club
    async rejectClub(clubId: number): Promise<Club> {
        const club = await this.clubRepository.findOne({ where: { id: clubId } });
        if (!club) {
            throw new NotFoundException('Club not found');
        }

        if (club.status !== ClubStatus.PENDING) {
            throw new Error('Club is not in pending status');
        }

        club.status = ClubStatus.REJECTED;
        return this.clubRepository.save(club);
    }
}
