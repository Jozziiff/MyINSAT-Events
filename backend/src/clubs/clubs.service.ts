import { Injectable, ForbiddenException } from '@nestjs/common';
import { ClubDto, ClubSummaryDto } from './dto/club.dto';
import { CreateClubDto, DEFAULT_SECTION_IMAGES } from './dto/create-club.dto';

@Injectable()
export class ClubsService {
  // Helper to apply default images to sections
  private applyDefaultImages(club: ClubDto): ClubDto {
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

  private nextId = 5;

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
    const club = this.clubs.find((club) => club.id === id);
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
      id: this.nextId++,
      ...createClubDto,
      ownerId: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.clubs.push(newClub);
    return newClub;
  }

  // Update a club (owner only)
  async updateClub(
    id: number,
    updateData: Partial<CreateClubDto>,
    userId: number,
    userRole: string,
  ): Promise<ClubDto | null> {
    const clubIndex = this.clubs.findIndex((club) => club.id === id);
    if (clubIndex === -1) return null;

    const club = this.clubs[clubIndex];

    // Only the owner of this club or admin can update
    if (userRole !== 'owner' || club.ownerId !== userId) {
      throw new ForbiddenException('Only the club owner can update this club');
    }

    this.clubs[clubIndex] = {
      ...club,
      ...updateData,
      updatedAt: new Date(),
    };

    return this.clubs[clubIndex];
  }

  // Delete a club (owner only)
  async deleteClub(
    id: number,
    userId: number,
    userRole: string,
  ): Promise<boolean> {
    const clubIndex = this.clubs.findIndex((club) => club.id === id);
    if (clubIndex === -1) return false;

    const club = this.clubs[clubIndex];

    if (userRole !== 'owner' || club.ownerId !== userId) {
      throw new ForbiddenException('Only the club owner can delete this club');
    }

    this.clubs.splice(clubIndex, 1);
    return true;
  }
}
