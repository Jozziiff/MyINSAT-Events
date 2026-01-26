import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Event } from '../entities';
import { EventStatus } from '../common/enums';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
  ) {}

  async getAllEvents() {
    return this.eventRepository.find({
      where: { status: EventStatus.PUBLISHED },
      relations: ['club'],
      order: { startTime: 'ASC' },
    });
  }

  async getUpcomingEvents() {
    const now = new Date();
    return this.eventRepository.find({
      where: {
        status: EventStatus.PUBLISHED,
        startTime: MoreThanOrEqual(now),
      },
      relations: ['club'],
      order: { startTime: 'ASC' },
    });
  }

  async getEventById(id: number) {
    return this.eventRepository.findOne({
      where: { id },
      relations: ['club'],
    });
  }
}