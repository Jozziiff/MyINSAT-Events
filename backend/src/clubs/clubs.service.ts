
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
  // Mock data - will be replaced with DB later
  private clubs: ClubDto[] = [
    {
      id: 1,
      name: 'IEEE INSAT',
      shortDescription:
        'Institute of Electrical and Electronics Engineers student branch at INSAT',
      logoUrl: '/uploads/clubs/ieee-logo.png',
      about:
        'IEEE INSAT Student Branch is one of the most active student branches in Tunisia. We are dedicated to advancing technology for the benefit of humanity through various workshops, conferences, and competitions.',
      history: {
        title: 'Our History',
        content:
          'Founded in 2005, IEEE INSAT has grown from a small group of passionate students to one of the largest technical clubs at INSAT with over 200 active members.'
      },
      mission: {
        title: 'Our Mission',
        content:
          'To foster technological innovation and excellence for the benefit of humanity by providing resources, networking opportunities, and educational programs.',
      },
      activities: {
        title: 'What We Do',
        content:
          'We organize technical workshops, hackathons, industry visits, and the annual IEEE Day celebration. Our flagship event is the TSYP conference.',
      },
      achievements: {
        title: 'Achievements',
        content:
          'Winner of the Best Student Branch Award 2024, organized 50+ workshops, and helped 100+ students get certified.',
      },
      joinUs: {
        title: 'Join IEEE INSAT',
        content:
          'Applications open every September. Follow our social media for announcements and join our community of innovators!',
      },
      contact: {
        email: 'ieee.insat@ieee.org',
        facebook: 'https://facebook.com/ieeeinsat',
        instagram: 'https://instagram.com/ieeeinsat',
        linkedin: 'https://linkedin.com/company/ieee-insat',
        website: 'https://ieeeinsat.tn',
      },
      coverImageUrl: '/uploads/clubs/ieee-cover.jpg',
      ownerId: 1,
      createdAt: new Date('2023-01-15'),
      updatedAt: new Date('2024-06-20'),
    },
    {
      id: 2,
      name: 'Google Developer Club',
      shortDescription:
        'Community of developers passionate about Google technologies',
      logoUrl: '/uploads/clubs/gdg-logo.png',
      about:
        'GDG INSAT is a community of developers interested in Google technologies. We host events, workshops, and study jams to help students learn and grow.',
      mission: {
        title: 'Our Mission',
        content:
          'To create a peer-to-peer learning environment where students can explore, learn, and apply Google technologies.',
      },
      activities: {
        title: 'Activities',
        content:
          'Android Study Jams, Flutter workshops, Cloud Study Jams, DevFest, and Solution Challenge participation.'
      },
      contact: {
        email: 'gdg.insat@gmail.com',
        instagram: 'https://instagram.com/gdginsat',
      },
      coverImageUrl: '/uploads/clubs/gdg-cover.png',
      ownerId: 2,
      createdAt: new Date('2023-03-10'),
      updatedAt: new Date('2024-05-15'),
    },
  ];

  constructor(
    @InjectRepository(Club)
    private readonly clubRepository: Repository<Club>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(Registration)
    private readonly registrationRepository: Repository<Registration>,
  ) {}

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
    return this.clubs.map((club) => ({
      id: club.id,
      name: club.name,
      shortDescription: club.shortDescription,
      logoUrl: club.logoUrl || DEFAULT_SECTION_IMAGES.logo,
    }));
  }

  // Get full club details by ID (with default images applied)
  async getClubById(id: number): Promise<ClubDto | undefined> {
    const club = this.clubs.find(c => c.id === id);
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
    const newClub: ClubDto = {
      id: Math.max(...this.clubs.map(c => c.id), 0) + 1,
      ...createClubDto,
      ownerId: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.clubs.push(newClub);
    return this.applyDefaultImages(newClub);
  }

  // Update a club (owner only)
  async updateClub(
    id: number,
    updateData: Partial<CreateClubDto>,
    userId: number,
    userRole: string,
  ): Promise<ClubDto | null> {
    const club = this.clubs.find(c => c.id === id);
    if (!club) return null;
    if (userRole !== 'owner' || club.ownerId !== userId) {
      throw new ForbiddenException('Only the club owner can update this club');
    }
    Object.assign(club, updateData, { updatedAt: new Date() });
    return this.applyDefaultImages(club);
  }

  // Delete a club (owner only)
  async deleteClub(
    id: number,
    userId: number,
    userRole: string,
  ): Promise<boolean> {
    const club = this.clubs.find(c => c.id === id);
    if (!club) return false;
    if (userRole !== 'owner' || club.ownerId !== userId) {
      throw new ForbiddenException('Only the club owner can delete this club');
    }
    const index = this.clubs.indexOf(club);
    this.clubs.splice(index, 1);
    return true;
  }

  // Get club events with statistics (past events only)
  async getClubEventsWithStats(clubId: number): Promise<any> {
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
      clubId,
      clubName: club.name,
      totalEvents: pastEvents.length,
      totalAttendance,
      averageAttendanceRate: clubAverageAttendanceRate,
      averageRating: 4.5, // Placeholder
      events: eventsWithStats,
    };
  }
}
