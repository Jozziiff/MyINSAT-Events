import { CanActivate, ExecutionContext, Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event, Registration } from '../../events/entities';
import { ClubManager, ClubJoinRequest } from '../../clubs/entities';

@Injectable()
export class ClubAccessGuard implements CanActivate {
    constructor(
        @InjectRepository(ClubManager)
        private clubManagerRepository: Repository<ClubManager>,
        @InjectRepository(Event)
        private eventRepository: Repository<Event>,
        @InjectRepository(Registration)
        private registrationRepository: Repository<Registration>,
        @InjectRepository(ClubJoinRequest)
        private joinRequestRepository: Repository<ClubJoinRequest>,
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
        const clubId = await this.resolveClubId(request.params, request.path, request.body);

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

    private async resolveClubId(params: Record<string, string>, path: string, body?: Record<string, any>): Promise<number | null> {
        // 1. Direct clubId from params (no DB query)
        if (params.clubId) {
            return parseInt(params.clubId, 10);
        }

        // 2. clubId from request body (for POST requests like createEvent)
        if (body?.clubId) {
            return body.clubId;
        }

        // 3. Club id param for /clubs/:id routes (no DB query)
        if (params.id && path.includes('/clubs/')) {
            return parseInt(params.id, 10);
        }

        // 4. Event route with :id param (requires DB lookup)
        if (params.id && path.includes('/events/')) {
            const event = await this.eventRepository.findOne({
                where: { id: parseInt(params.id, 10) },
            });
            if (!event) {
                throw new NotFoundException('Event not found');
            }
            return event.clubId;
        }

        // 5. Registration route with :id param (requires DB lookup)
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

        // 6. Join request route with :requestId param (requires DB lookup)
        if (params.requestId && path.includes('/join-requests/')) {
            const joinRequest = await this.joinRequestRepository.findOne({
                where: { id: parseInt(params.requestId, 10) },
            });
            if (!joinRequest) {
                throw new NotFoundException('Join request not found');
            }
            return joinRequest.clubId;
        }

        return null;
    }
}
