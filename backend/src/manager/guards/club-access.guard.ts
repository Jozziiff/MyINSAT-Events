import { CanActivate, ExecutionContext, Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClubManager, Event, Registration } from '../../entities';

@Injectable()
export class ClubAccessGuard implements CanActivate {
    constructor(
        @InjectRepository(ClubManager)
        private clubManagerRepository: Repository<ClubManager>,
        @InjectRepository(Event)
        private eventRepository: Repository<Event>,
        @InjectRepository(Registration)
        private registrationRepository: Repository<Registration>,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) {
            throw new ForbiddenException('User not authenticated');
        }

        // Admins have access to all clubs
        if (user.role === 'ADMIN') {
            return true;
        }

        // Try to get clubId from various sources
        const clubId = await this.resolveClubId(request.params, request.path);

        if (!clubId) {
            throw new ForbiddenException('Unable to determine club access');
        }

        // Check if user is a manager of this club
        const managerRecord = await this.clubManagerRepository.findOne({
            where: { userId: user.id, clubId },
        });

        if (!managerRecord) {
            throw new ForbiddenException('You do not have access to this club');
        }

        return true;
    }

    private async resolveClubId(params: Record<string, string>, path: string): Promise<number | null> {
        // 1. Direct clubId from params (no DB query)
        if (params.clubId) {
            return parseInt(params.clubId, 10);
        }

        // 2. Club id param for /clubs/:id routes (no DB query)
        if (params.id && path.includes('/clubs/')) {
            return parseInt(params.id, 10);
        }

        // 3. Event route with :id param (requires DB lookup)
        if (params.id && path.includes('/events/')) {
            const event = await this.eventRepository.findOne({
                where: { id: parseInt(params.id, 10) },
            });
            if (!event) {
                throw new NotFoundException('Event not found');
            }
            return event.clubId;
        }

        // 4. Registration route with :id param (requires DB lookup)
        if (params.id && path.includes('/registrations/')) {
            const registration = await this.registrationRepository.findOne({
                where: { id: parseInt(params.id, 10) },
                relations: ['event'],
            });
            if (!registration) {
                throw new NotFoundException('Registration not found');
            }
            return registration.event.clubId;
        }

        return null;
    }
}
