import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Event, Registration, EventRating } from './entities';
import { EventStatus, RegistrationStatus } from './enums';
import { RateEventDto } from './dto';

export interface EventWithStats {
  id: number;
  title: string;
  description: string | null;
  location: string | null;
  startTime: Date;
  endTime: Date;
  capacity: number | null;
  price: number | null;
  photoUrl: string | null;
  sections: any[] | null;
  status: EventStatus;
  createdAt: Date;
  updatedAt: Date;
  club: {
    id: number;
    name: string;
    logoUrl: string | null;
  } | null;
  stats: {
    interestedCount: number;
    confirmedCount: number;
    attendedCount: number;
    averageRating: number;
    ratingCount: number;
  };
  userInteraction?: {
    status: RegistrationStatus | null;
    hasRated: boolean;
    userRating?: number;
  };
}

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(Registration)
    private readonly registrationRepository: Repository<Registration>,
    @InjectRepository(EventRating)
    private readonly eventRatingRepository: Repository<EventRating>,
  ) { }

  private async getEventStats(eventId: number): Promise<{
    interestedCount: number;
    confirmedCount: number;
    attendedCount: number;
    averageRating: number;
    ratingCount: number;
  }> {
    const [interestedCount, confirmedCount, attendedCount] = await Promise.all([
      this.registrationRepository.count({
        where: { eventId, status: RegistrationStatus.INTERESTED },
      }),
      this.registrationRepository.count({
        where: { eventId, status: RegistrationStatus.CONFIRMED },
      }),
      this.registrationRepository.count({
        where: { eventId, status: RegistrationStatus.ATTENDED },
      }),
    ]);

    const ratingResult = await this.eventRatingRepository
      .createQueryBuilder('rating')
      .select('AVG(rating.rating)', 'avgRating')
      .addSelect('COUNT(rating.id)', 'count')
      .where('rating.eventId = :eventId', { eventId })
      .getRawOne();

    return {
      interestedCount,
      confirmedCount,
      attendedCount,
      averageRating: parseFloat(ratingResult?.avgRating) || 0,
      ratingCount: parseInt(ratingResult?.count) || 0,
    };
  }

  private async getUserInteraction(eventId: number, userId?: number): Promise<{
    status: RegistrationStatus | null;
    hasRated: boolean;
    userRating?: number;
  } | undefined> {
    if (!userId) return undefined;

    const [registration, rating] = await Promise.all([
      this.registrationRepository.findOne({
        where: { eventId, userId },
      }),
      this.eventRatingRepository.findOne({
        where: { eventId, userId },
      }),
    ]);

    return {
      status: registration?.status || null,
      hasRated: !!rating,
      userRating: rating?.rating,
    };
  }

  private async enrichEventWithStats(event: Event, userId?: number): Promise<EventWithStats> {
    const [stats, userInteraction] = await Promise.all([
      this.getEventStats(event.id),
      this.getUserInteraction(event.id, userId),
    ]);

    return {
      id: event.id,
      title: event.title,
      description: event.description,
      location: event.location,
      startTime: event.startTime,
      endTime: event.endTime,
      capacity: event.capacity,
      price: event.price,
      photoUrl: event.photoUrl,
      sections: event.sections,
      status: event.status,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      club: event.club ? {
        id: event.club.id,
        name: event.club.name,
        logoUrl: event.club.logoUrl,
      } : null,
      stats,
      userInteraction,
    };
  }

  async getAllEvents(userId?: number): Promise<EventWithStats[]> {
    const events = await this.eventRepository.find({
      where: { status: EventStatus.PUBLISHED },
      relations: ['club'],
      order: { startTime: 'ASC' },
    });

    return Promise.all(events.map(event => this.enrichEventWithStats(event, userId)));
  }

  async getUpcomingEvents(userId?: number): Promise<EventWithStats[]> {
    const now = new Date();
    const events = await this.eventRepository.find({
      where: {
        status: EventStatus.PUBLISHED,
        startTime: MoreThanOrEqual(now),
      },
      relations: ['club'],
      order: { startTime: 'ASC' },
    });

    return Promise.all(events.map(event => this.enrichEventWithStats(event, userId)));
  }

  async getTrendingEvents(userId?: number, limit: number = 3): Promise<EventWithStats[]> {
    const now = new Date();

    // Get all published events (including recent past ones for rating consideration)
    const events = await this.eventRepository.find({
      where: {
        status: EventStatus.PUBLISHED,
      },
      relations: ['club'],
    });

    // Enrich all events with stats
    const enrichedEvents = await Promise.all(
      events.map(event => this.enrichEventWithStats(event, userId))
    );

    // Calculate trending score with comprehensive algorithm
    const scoredEvents = enrichedEvents.map(event => {
      const eventDate = new Date(event.startTime);
      const isPast = eventDate < now;
      const daysUntil = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      const daysSince = isPast ? Math.abs(daysUntil) : 0;

      let score = 0;

      if (isPast) {
        // Past events: penalize heavily based on age, boost by rating
        const agePenalty = Math.max(0, 100 - (daysSince * 5)); // Lose 5 points per day old
        const ratingBoost = event.stats.averageRating * event.stats.ratingCount * 3;
        score = agePenalty + ratingBoost;
      } else {
        // Upcoming events
        // Urgency boost: closer events get higher score (max 50 points for events within 7 days)
        const urgencyBoost = daysUntil <= 7 ? (50 - (daysUntil * 7)) : 0;

        // Interest boost: 2 points per interested person
        const interestBoost = event.stats.interestedCount * 2;

        // Confirmation boost: 3 points per confirmed person
        const confirmBoost = event.stats.confirmedCount * 3;

        // Rating boost: average rating * count
        const ratingBoost = event.stats.averageRating * event.stats.ratingCount;

        // Availability boost: events with remaining capacity get a bonus
        let availabilityBoost = 10; // Default bonus for unlimited capacity
        if (event.capacity) {
          const filled = event.stats.confirmedCount + event.stats.interestedCount;
          const remainingPercent = Math.max(0, (event.capacity - filled) / event.capacity);
          // Events that are 50-80% full are most trending
          if (remainingPercent > 0.2 && remainingPercent <= 0.5) {
            availabilityBoost = 20; // Hot! Almost full but still available
          } else if (remainingPercent > 0.5) {
            availabilityBoost = 10; // Good availability
          } else if (remainingPercent > 0) {
            availabilityBoost = 15; // Very limited, creates urgency
          } else {
            availabilityBoost = -20; // Full, deprioritize
          }
        }

        score = urgencyBoost + interestBoost + confirmBoost + ratingBoost + availabilityBoost + 50; // Base score for upcoming
      }

      return { event, score };
    });

    // Sort by score and return top events
    scoredEvents.sort((a, b) => b.score - a.score);

    return scoredEvents.slice(0, limit).map(s => s.event);
  }

  async getEventById(id: number, userId?: number): Promise<EventWithStats> {
    const event = await this.eventRepository.findOne({
      where: { id },
      relations: ['club'],
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return this.enrichEventWithStats(event, userId);
  }

  /**
   * Register or update registration for an event
   * Status flow: INTERESTED → PENDING_PAYMENT (if paid) → CONFIRMED
   * 
   * Valid statuses:
   * - INTERESTED: User shows casual interest ("I'm Interested" button)
   * - PENDING_PAYMENT: User wants to register but payment required (paid events only)
   * - CONFIRMED: User is officially registered ("Confirm Attendance" button for free events)
   */
  async registerForEvent(eventId: number, userId: number, status: string): Promise<Registration> {
    const event = await this.eventRepository.findOne({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.status !== EventStatus.PUBLISHED) {
      throw new BadRequestException('Cannot register for unpublished events');
    }

    // Validate status - only allow user-initiated statuses
    const validStatuses = [
      RegistrationStatus.INTERESTED,
      RegistrationStatus.PENDING_PAYMENT,
      RegistrationStatus.CONFIRMED
    ];
    if (!validStatuses.includes(status as RegistrationStatus)) {
      throw new BadRequestException('Invalid registration status');
    }

    // Check if user already has a registration
    let registration = await this.registrationRepository.findOne({
      where: { eventId, userId },
    });

    if (registration) {
      // Only validate status transitions for active registrations
      // Allow re-registration after CANCELLED or REJECTED
      if (registration.status === RegistrationStatus.CANCELLED || registration.status === RegistrationStatus.REJECTED) {
        // Allow fresh start after cancellation/rejection
        registration.status = status as RegistrationStatus;
        return this.registrationRepository.save(registration);
      }

      // Validate status transitions for active registrations
      // Can't go backwards from CONFIRMED to INTERESTED
      if (registration.status === RegistrationStatus.CONFIRMED && status === RegistrationStatus.INTERESTED) {
        throw new BadRequestException('Cannot downgrade from confirmed to interested. Cancel registration instead.');
      }

      // Update existing registration
      registration.status = status as RegistrationStatus;
      return this.registrationRepository.save(registration);
    }

    // Create new registration
    registration = this.registrationRepository.create({
      eventId,
      userId,
      status: status as RegistrationStatus,
    });

    return this.registrationRepository.save(registration);
  }

  // Cancel registration
  async cancelRegistration(eventId: number, userId: number): Promise<void> {
    const registration = await this.registrationRepository.findOne({
      where: { eventId, userId },
    });

    if (!registration) {
      throw new NotFoundException('Registration not found');
    }

    if (registration.status === RegistrationStatus.CANCELLED) {
      throw new BadRequestException('Registration already cancelled');
    }

    // For INTERESTED status, delete the registration completely (allows clean toggle)
    // For CONFIRMED/PENDING_PAYMENT, mark as CANCELLED (keeps history for analytics)
    if (registration.status === RegistrationStatus.INTERESTED) {
      await this.registrationRepository.delete(registration.id);
    } else {
      registration.status = RegistrationStatus.CANCELLED;
      await this.registrationRepository.save(registration);
    }
  }

  // User rates an event (only if attended)
  async rateEvent(eventId: number, userId: number, rateEventDto: RateEventDto): Promise<EventRating> {
    const event = await this.eventRepository.findOne({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Check if user attended the event
    const registration = await this.registrationRepository.findOne({
      where: { eventId, userId, status: RegistrationStatus.ATTENDED },
    });

    if (!registration) {
      throw new ForbiddenException('You can only rate events you have attended');
    }

    // Check if user already rated
    let rating = await this.eventRatingRepository.findOne({
      where: { eventId, userId },
    });

    if (rating) {
      // Update existing rating
      rating.rating = rateEventDto.rating;
      rating.comment = rateEventDto.comment ?? null;
      return this.eventRatingRepository.save(rating);
    }

    // Create new rating
    rating = this.eventRatingRepository.create({
      eventId,
      userId,
      rating: rateEventDto.rating,
      comment: rateEventDto.comment ?? null,
    });

    return this.eventRatingRepository.save(rating);
  }

  // Get user's registration status for an event
  async getUserRegistration(eventId: number, userId: number): Promise<Registration | null> {
    return this.registrationRepository.findOne({
      where: { eventId, userId },
    });
  }

  // Get event ratings
  async getEventRatings(eventId: number): Promise<EventRating[]> {
    return this.eventRatingRepository.find({
      where: { eventId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }
}