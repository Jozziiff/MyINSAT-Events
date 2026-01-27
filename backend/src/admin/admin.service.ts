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
    async getPendingClubs(): Promise<Club[]> {
        return this.clubRepository.find({
            where: { status: ClubStatus.PENDING },
            relations: ['owner'],
            order: { createdAt: 'DESC' },
        });
    }

    // Get all clubs filtered by status
    async getAllClubs(status?: ClubStatus): Promise<Club[]> {
        const where = status ? { status } : {};
        return this.clubRepository.find({
            where,
            relations: ['owner'],
            order: { createdAt: 'DESC' },
        });
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
        if (club.userId) {
            const owner = await this.userRepository.findOne({
                where: { id: club.userId },
            });

            if (owner && owner.role === UserRole.USER) {
                owner.role = UserRole.MANAGER;
                await this.userRepository.save(owner);
            }

            // Create ClubManager record if it doesn't exist
            const existingManager = await this.clubManagerRepository.findOne({
                where: { clubId: club.id, userId: club.userId },
            });

            if (!existingManager) {
                const clubManager = this.clubManagerRepository.create({
                    clubId: club.id,
                    userId: club.userId,
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
