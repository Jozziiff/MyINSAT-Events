import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, Not } from 'typeorm';
import { Event, Registration } from '../events/entities';
import { Club, ClubManager } from '../clubs/entities';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { UpdateClubDto } from './dto/update-club.dto';
import { EventStatus, RegistrationStatus } from '../common/enums';

@Injectable()
export class ManagerService {
    constructor(
        @InjectRepository(Event)
        private eventRepository: Repository<Event>,
        @InjectRepository(Club)
        private clubRepository: Repository<Club>,
        @InjectRepository(Registration)
        private registrationRepository: Repository<Registration>,
        @InjectRepository(ClubManager)
        private clubManagerRepository: Repository<ClubManager>,
    ) { }


    private async getEventWithAccess(userId: number, eventId: number): Promise<Event> {
        const event = await this.eventRepository.findOne({ where: { id: eventId } });

        if (!event) {
            throw new NotFoundException('Event not found');
        }

        // Access check is handled by ClubAccessGuard
        return event;
    }

    private validateEventDates(startTime: string, endTime: string): void {
        const start = new Date(startTime);
        const end = new Date(endTime);
        const now = new Date();

        if (start < now) {
            throw new BadRequestException('Event start time cannot be in the past');
        }

        if (start >= end) {
            throw new BadRequestException('End time must be after start time');
        }
    }

    private async checkLocationConflict(
        location: string,
        startTime: string,
        endTime: string,
        excludeEventId?: number
    ): Promise<void> {

        const conflictingEvent = await this.eventRepository.findOne({
            where: {
                location,
                startTime: LessThan(new Date(endTime)),
                endTime: MoreThan(new Date(startTime)),
                ...(excludeEventId && { id: Not(excludeEventId) }),
            },
        });

        if (conflictingEvent) {
            throw new BadRequestException(
                `Another event is already scheduled at "${location}" during this time period`
            );
        }
    }

    async createEvent(createEventDto: CreateEventDto): Promise<Event> {
        // Access check is handled by ClubAccessGuard
        this.validateEventDates(createEventDto.startTime, createEventDto.endTime);

        await this.checkLocationConflict(
            createEventDto.location,
            createEventDto.startTime,
            createEventDto.endTime
        );

        const event = this.eventRepository.create({
            ...createEventDto,
            status: EventStatus.DRAFT,
        });

        return this.eventRepository.save(event);
    }

    async updateEvent(userId: number, eventId: number, updateEventDto: UpdateEventDto): Promise<Event> {
        const event = await this.getEventWithAccess(userId, eventId);

        if (updateEventDto.startTime && updateEventDto.endTime) {
            this.validateEventDates(updateEventDto.startTime, updateEventDto.endTime);

            // Check for location conflicts if location, start time, or end time is being updated
            await this.checkLocationConflict(
                updateEventDto.location || event.location,
                updateEventDto.startTime,
                updateEventDto.endTime,
                eventId // Exclude current event from conflict check
            );
        }

        Object.assign(event, updateEventDto);
        return this.eventRepository.save(event);
    }

    async deleteEvent(userId: number, eventId: number): Promise<void> {
        await this.getEventWithAccess(userId, eventId);
        await this.eventRepository.delete(eventId);
    }

    async publishEvent(userId: number, eventId: number): Promise<Event> {
        const event = await this.getEventWithAccess(userId, eventId);
        event.status = EventStatus.PUBLISHED;
        return this.eventRepository.save(event);
    }

    async getEventRegistrations(userId: number, eventId: number) {
        const event = await this.getEventWithAccess(userId, eventId);

        const registrations = await this.registrationRepository.find({
            where: { eventId },
            relations: ['user'],
            order: { createdAt: 'DESC' },
        });

        const confirmedCount = registrations.filter(r => r.status === RegistrationStatus.CONFIRMED).length;

        return {
            event: {
                id: event.id,
                title: event.title,
                capacity: event.capacity,
                confirmedCount,
                startTime: event.startTime,
            },
            registrations: registrations.map(r => ({
                id: r.id,
                user: {
                    id: r.user.id,
                    email: r.user.email,
                    fullName: r.user.fullName,
                    avatarUrl: r.user.avatarUrl,
                },
                status: r.status,
                createdAt: r.createdAt,
            })),
        };
    }

    async updateRegistrationStatus(
        userId: number,
        registrationId: number,
        newStatus: RegistrationStatus,
    ): Promise<Registration> {
        const registration = await this.registrationRepository.findOne({
            where: { id: registrationId },
            relations: ['event'],
        });

        if (!registration) {
            throw new NotFoundException('Registration not found');
        }

        // Access check is handled by ClubAccessGuard

        // Validate attendance marking can only happen on or after event day
        if ((newStatus === RegistrationStatus.ATTENDED || newStatus === RegistrationStatus.NO_SHOW)) {
            const eventDate = new Date(registration.event.startTime);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            eventDate.setHours(0, 0, 0, 0);

            if (eventDate > today) {
                throw new BadRequestException('Attendance can only be marked on or after the event day');
            }
        }

        if (newStatus === RegistrationStatus.CONFIRMED) {
            const confirmedCount = await this.registrationRepository.count({
                where: {
                    eventId: registration.eventId,
                    status: RegistrationStatus.CONFIRMED,
                },
            });

            if (registration.event.capacity && confirmedCount >= registration.event.capacity) {
                throw new BadRequestException('Event capacity reached');
            }
        }

        registration.status = newStatus;
        return this.registrationRepository.save(registration);
    }

    async updateClub(clubId: number, updateClubDto: UpdateClubDto): Promise<Club> {
        // Access check is handled by ClubAccessGuard
        const club = await this.clubRepository.findOne({ where: { id: clubId } });

        if (!club) {
            throw new NotFoundException('Club not found');
        }

        Object.assign(club, updateClubDto);
        return this.clubRepository.save(club);
    }

    /**
     * Returns the list of clubs managed by the given user.
     *
     * When `userRole` is `'ADMIN'`, this method returns all clubs in the system.
     * For any other role value, or when `userRole` is omitted, it only returns
     * the clubs for which the user is registered as a manager.
     *
     * @param userId   The ID of the user whose managed clubs should be retrieved.
     * @param userRole Optional role of the user. Pass `'ADMIN'` to retrieve all clubs;
     *                 otherwise, only clubs managed by the user are returned.
     * @returns A promise resolving to the list of clubs visible to the user.
     */
    async getAllManagedClubs(userId: number, userRole?: string): Promise<Club[]> {
        // If user is admin, return all clubs
        if (userRole === 'ADMIN') {
            return this.clubRepository.find();
        }

        const managerRecords = await this.clubManagerRepository.find({
            where: { userId },
            relations: ['club'],
        });

        return managerRecords.map(record => record.club);
    }

    async getClubManagers(userId: number, clubId: number): Promise<{ id: number; fullName: string; email: string; avatarUrl: string }[]> {
        // Access check is handled by ClubAccessGuard

        const managers = await this.clubManagerRepository.find({
            where: { clubId },
            relations: ['user'],
        });

        return managers.map(m => ({
            id: m.user.id,
            fullName: m.user.fullName,
            email: m.user.email,
            avatarUrl: m.user.avatarUrl,
        }));
    }

    async removeManager(userId: number, clubId: number, managerUserId: number): Promise<void> {
        // Access check is handled by ClubAccessGuard

        // Prevent removing yourself
        if (userId === managerUserId) {
            throw new BadRequestException('You cannot remove yourself as a manager');
        }

        const managerRecord = await this.clubManagerRepository.findOne({
            where: { clubId, userId: managerUserId },
        });

        if (!managerRecord) {
            throw new NotFoundException('Manager not found');
        }

        await this.clubManagerRepository.delete(managerRecord.id);
    }

    async getManagedClubById(userId: number, clubId: number): Promise<Club> {
        // Access check is handled by ClubAccessGuard
        
        const club = await this.clubRepository.findOne({
            where: { id: clubId },
        });

        if (!club) {
            throw new NotFoundException('Club not found');
        }

        return club;
    }

    async getClubEvents(clubId: number): Promise<Event[]> {
        // Access check is handled by ClubAccessGuard

        return this.eventRepository.find({
            where: { clubId },
            order: { startTime: 'ASC' },
        });
    }
}
