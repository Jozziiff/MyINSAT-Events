
import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Club } from '../entities/club.entity';
import { Event } from '../entities/event.entity';
import { Registration } from '../entities/registration.entity';
import { RegistrationStatus } from '../common/enums';
import { ClubDto, ClubSummaryDto } from './dto/club.dto';
import { CreateClubDto, DEFAULT_SECTION_IMAGES } from './dto/create-club.dto';


@Injectable()
export class ClubsService {
  constructor(
    @InjectRepository(Club)
    private readonly clubRepository: Repository<Club>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(Registration)
    private readonly registrationRepository: Repository<Registration>,
  ) { }

  // Helper to apply default images to sections (unchanged)
  private applyDefaultImages(club: any): any {
    return {
      ...club,
      logoUrl: club.logoUrl || DEFAULT_SECTION_IMAGES.logo,
      aboutImageUrl: club.aboutImageUrl || DEFAULT_SECTION_IMAGES.about,
      coverImageUrl: club.coverImageUrl || DEFAULT_SECTION_IMAGES.cover,
      history: club.history
        ? {
          ...club.history,
          imageUrl: club.history.imageUrl || DEFAULT_SECTION_IMAGES.history,
        }
        : undefined,
      mission: club.mission
        ? {
          ...club.mission,
          imageUrl: club.mission.imageUrl || DEFAULT_SECTION_IMAGES.mission,
        }
        : undefined,
      activities: club.activities
        ? {
          ...club.activities,
          imageUrl:
            club.activities.imageUrl || DEFAULT_SECTION_IMAGES.activities,
        }
        : undefined,
      achievements: club.achievements
        ? {
          ...club.achievements,
          imageUrl:
            club.achievements.imageUrl || DEFAULT_SECTION_IMAGES.achievements,
        }
        : undefined,
      joinUs: club.joinUs
        ? {
          ...club.joinUs,
          imageUrl: club.joinUs.imageUrl || DEFAULT_SECTION_IMAGES.joinUs,
        }
        : undefined,
    };
  }

  // Get all clubs (summary only for list page)
  async getAllClubs(): Promise<ClubSummaryDto[]> {
    const clubs = await this.clubRepository.find({
      select: ['id', 'name', 'shortDescription', 'logoUrl'],
    });

    return clubs.map((club) => ({
      id: club.id,
      name: club.name,
      shortDescription: club.shortDescription,
      logoUrl: club.logoUrl || DEFAULT_SECTION_IMAGES.logo,
    }));
  }

  // Get full club details by ID (with default images applied)
  async getClubById(id: number): Promise<ClubDto | undefined> {
    const club = await this.clubRepository.findOne({ where: { id } });
    if (!club) return undefined;
    return this.applyDefaultImages(club);
  }

  // Create a new club (owner only)
  async createClub(
    createClubDto: CreateClubDto,
    userId: number,
    userRole: string,
  ): Promise<ClubDto> {
    if (userRole !== 'owner') {
      throw new ForbiddenException('Only owners can create clubs');
    }

    const newClub = this.clubRepository.create({
      ...createClubDto,
      ownerId: userId,
    });

    const savedClub = await this.clubRepository.save(newClub);
    return this.applyDefaultImages(savedClub);
  }

  // Update a club (owner only)
  async updateClub(
    id: number,
    updateData: Partial<CreateClubDto>,
    userId: number,
    userRole: string,
  ): Promise<ClubDto | null> {
    const club = await this.clubRepository.findOne({ where: { id } });
    if (!club) return null;

    if (userRole !== 'owner' || club.ownerId !== userId) {
      throw new ForbiddenException('Only the club owner can update this club');
    }

    Object.assign(club, updateData);
    const updatedClub = await this.clubRepository.save(club);
    return this.applyDefaultImages(updatedClub);
  }

  // Delete a club (owner only)
  async deleteClub(
    id: number,
    userId: number,
    userRole: string,
  ): Promise<boolean> {
    const club = await this.clubRepository.findOne({ where: { id } });
    if (!club) return false;

    if (userRole !== 'owner' || club.ownerId !== userId) {
      throw new ForbiddenException('Only the club owner can delete this club');
    }

    await this.clubRepository.delete(id);
    return true;
  }

  // Get club events with statistics (past events only)
  async getClubEventsWithStats(clubId: number): Promise<{
    events: any[];
    statistics: {
      totalEvents: number;
      totalAttendance: number;
      averageAttendanceRate: number;
    };
  } | null> {
    // Check if club exists
    const club = await this.clubRepository.findOne({ where: { id: clubId } });
    if (!club) return null;

    // Get past events for this club
    const events = await this.eventRepository.find({
      where: { clubId },
      relations: ['registrations'],
      order: { startTime: 'DESC' },
    });

    // Filter to past events only
    const now = new Date();
    const pastEvents = events.filter(e => new Date(e.endTime) < now);

    // Calculate statistics for each event
    const eventsWithStats = pastEvents.map(event => {
      const registrations = event.registrations || [];
      const attendedCount = registrations.filter(r => r.status === RegistrationStatus.ATTENDED).length;
      const attendanceRate = registrations.length > 0
        ? Math.round((attendedCount / registrations.length) * 100)
        : 0;

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
        status: event.status,
        registrationsCount: registrations.length,
        attendedCount,
        attendanceRate,
        averageRating: 4.5, // Placeholder - implement if you add ratings table
      };
    });

    // Calculate club statistics
    const totalAttendance = pastEvents.reduce((sum, e) => {
      const attended = e.registrations?.filter(r => r.status === RegistrationStatus.ATTENDED).length || 0;
      return sum + attended;
    }, 0);

    const totalRegistrations = pastEvents.reduce((sum, e) => {
      return sum + (e.registrations?.length || 0);
    }, 0);

    const clubAverageAttendanceRate = totalRegistrations > 0
      ? Math.round((totalAttendance / totalRegistrations) * 100)
      : 0;

    return {
      events: eventsWithStats,
      statistics: {
        totalEvents: pastEvents.length,
        totalAttendance,
        averageAttendanceRate: clubAverageAttendanceRate,
      },
    };
  }
}
