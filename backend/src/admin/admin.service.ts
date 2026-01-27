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
            .leftJoinAndSelect('club.owner', 'owner', 'club.ownerId = owner.id')
            .where('club.status = :status', { status: ClubStatus.PENDING })
            .orderBy('club.createdAt', 'DESC')
            .getMany();

        return clubs.map(club => ({
            id: club.id,
            name: club.name,
            shortDescription: club.shortDescription,
            logoUrl: club.logoUrl,
            createdAt: club.createdAt,
            status: club.status,
            ownerId: club.ownerId,
            owner: club.ownerId ? {
                id: club.ownerId,
                fullName: (club as any).owner?.fullName || 'Unknown',
                email: (club as any).owner?.email || 'Unknown',
            } : null,
        }));
    }

    // Get all clubs filtered by status
    async getAllClubs(status?: ClubStatus): Promise<any[]> {
        let query = this.clubRepository
            .createQueryBuilder('club')
            .leftJoinAndSelect('club.owner', 'owner', 'club.ownerId = owner.id')
            .orderBy('club.createdAt', 'DESC');

        if (status) {
            query = query.where('club.status = :status', { status });
        }

        const clubs = await query.getMany();

        return clubs.map(club => ({
            id: club.id,
            name: club.name,
            shortDescription: club.shortDescription,
            logoUrl: club.logoUrl,
            createdAt: club.createdAt,
            status: club.status,
            ownerId: club.ownerId,
            owner: club.ownerId ? {
                id: club.ownerId,
                fullName: (club as any).owner?.fullName || 'Unknown',
                email: (club as any).owner?.email || 'Unknown',
            } : null,
        }));
    }

    // Approve a club
    async approveClub(clubId: number): Promise<Club> {
        const club = await this.clubRepository.findOne({ where: { id: clubId } });
        if (!club) {
            throw new NotFoundException('Club not found');
        }

        // Update club status
        club.status = ClubStatus.APPROVED;
        await this.clubRepository.save(club);

        // If club has an owner, update their role to MANAGER and create ClubManager record
        if (club.ownerId) {
            const owner = await this.userRepository.findOne({
                where: { id: club.ownerId },
            });

            if (owner && owner.role === UserRole.USER) {
                owner.role = UserRole.MANAGER;
                await this.userRepository.save(owner);
            }

            // Create ClubManager record if it doesn't exist
            const existingManager = await this.clubManagerRepository.findOne({
                where: { clubId: club.id, userId: club.ownerId },
            });

            if (!existingManager) {
                const clubManager = this.clubManagerRepository.create({
                    clubId: club.id,
                    userId: club.ownerId,
                });
                await this.clubManagerRepository.save(clubManager);
            }
        }

        return club;
    }

    // Reject a club
    async rejectClub(clubId: number): Promise<Club> {
        const club = await this.clubRepository.findOne({ where: { id: clubId } });
        if (!club) {
            throw new NotFoundException('Club not found');
        }

        club.status = ClubStatus.REJECTED;
        return this.clubRepository.save(club);
    }
}
