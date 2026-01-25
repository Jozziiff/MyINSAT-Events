import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event, Club, Registration, ClubManager } from '../entities';
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

    private async verifyManagerAccess(userId: number, clubId: number): Promise<void> {
        const managerRecord = await this.clubManagerRepository.findOne({
            where: { userId, clubId },
        });

        if (!managerRecord) {
            throw new ForbiddenException('You do not have access to this club');
        }
    }

    private async getEventWithAccess(userId: number, eventId: number): Promise<Event> {
        const event = await this.eventRepository.findOne({ where: { id: eventId } });

        if (!event) {
            throw new NotFoundException('Event not found');
        }

        await this.verifyManagerAccess(userId, event.clubId);
        return event;
    }

    private validateEventDates(startTime: string, endTime: string): void {
        if (new Date(startTime) >= new Date(endTime)) {
            throw new BadRequestException('End time must be after start time');
        }
    }

    async getManagedClub(userId: number): Promise<Club> {
        const managerRecord = await this.clubManagerRepository.findOne({
            where: { userId },
            relations: ['club'],
        });

        if (!managerRecord) {
            throw new NotFoundException('You are not managing any club');
        }

        return managerRecord.club;
    }

    async getAllEvents(userId: number): Promise<Event[]> {
        const club = await this.getManagedClub(userId);

        return this.eventRepository.find({
            where: { clubId: club.id },
            order: { startTime: 'ASC' },
        });
    }

    async createEvent(userId: number, createEventDto: CreateEventDto): Promise<Event> {
        const club = await this.getManagedClub(userId);
        this.validateEventDates(createEventDto.startTime, createEventDto.endTime);

        const event = this.eventRepository.create({
            ...createEventDto,
            clubId: club.id,
            status: EventStatus.DRAFT,
        });

        return this.eventRepository.save(event);
    }

    async updateEvent(userId: number, eventId: number, updateEventDto: UpdateEventDto): Promise<Event> {
        const event = await this.getEventWithAccess(userId, eventId);

        if (updateEventDto.startTime && updateEventDto.endTime) {
            this.validateEventDates(updateEventDto.startTime, updateEventDto.endTime);
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
            },
            registrations: registrations.map(r => ({
                id: r.id,
                user: {
                    id: r.user.id,
                    email: r.user.email,
                    fullName: r.user.fullName,
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

        await this.verifyManagerAccess(userId, registration.event.clubId);

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

    async updateClub(userId: number, updateClubDto: UpdateClubDto): Promise<Club> {
        const club = await this.getManagedClub(userId);

        Object.assign(club, updateClubDto);
        return this.clubRepository.save(club);
    }
}
