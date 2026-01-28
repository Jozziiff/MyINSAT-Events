import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, LessThan, MoreThanOrEqual, In } from 'typeorm';
import { User, Registration, ClubFollower, ClubManager, EventRating, Event, Club } from '../entities';
import { UserRole, RegistrationStatus, EventStatus } from '../common/enums';
import { UpdateProfileDto } from './dto/update-profile.dto';
import {
  UserProfileDto,
  UserDashboardDto,
  UserEventDto,
  FollowedClubDto,
  UserRatingDto,
} from './dto/user-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Registration)
    private registrationRepository: Repository<Registration>,
    @InjectRepository(ClubFollower)
    private clubFollowerRepository: Repository<ClubFollower>,
    @InjectRepository(ClubManager)
    private clubManagerRepository: Repository<ClubManager>,
    @InjectRepository(EventRating)
    private eventRatingRepository: Repository<EventRating>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    @InjectRepository(Club)
    private clubRepository: Repository<Club>,
  ) {}

  async findOne(options: FindOptionsWhere<User>): Promise<User | null> {
    return this.userRepository.findOne({ where: options });
  }

  async findById(id: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async create(userData: {
    email: string;
    passwordHash: string;
    fullName: string;
    role?: UserRole;
  }): Promise<User> {
    const existingUser = await this.findByEmail(userData.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const user = this.userRepository.create({
      ...userData,
      role: userData.role || UserRole.USER,
      emailVerified: false,
      isActive: true,
    });

    return this.userRepository.save(user);
  }

  async save(user: User): Promise<User> {
    return this.userRepository.save(user);
  }

  async update(id: number, updates: Partial<User>): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    Object.assign(user, updates);
    return this.userRepository.save(user);
  }

  // Get user profile
  async getProfile(userId: number): Promise<UserProfileDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      studentYear: user.studentYear,
      phoneNumber: user.phoneNumber,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    };
  }

  // Get public user profile (comprehensive info for profile page)
  async getPublicProfile(userId: number): Promise<{
    id: number;
    fullName: string;
    avatarUrl: string | null;
    bio: string | null;
    studentYear: string | null;
    createdAt: Date;
    followedClubs: { id: number; name: string; logoUrl: string | null; shortDescription: string }[];
    managedClubs: { id: number; name: string; logoUrl: string | null; shortDescription: string }[];
    upcomingEvents: { id: number; title: string; photoUrl: string | null; startTime: Date; clubName: string; status: string }[];
    pastEvents: { id: number; title: string; photoUrl: string | null; startTime: Date; clubName: string; status: string }[];
  }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const now = new Date();

    // Get followed clubs
    const followedClubsData = await this.clubFollowerRepository.find({
      where: { userId },
      relations: ['club'],
      order: { createdAt: 'DESC' },
    });

    const followedClubs = followedClubsData.map(f => ({
      id: f.club.id,
      name: f.club.name,
      logoUrl: f.club.logoUrl,
      shortDescription: f.club.shortDescription,
    }));

    // Get managed clubs
    const managedClubsData = await this.clubManagerRepository.find({
      where: { userId },
      relations: ['club'],
    });

    const managedClubs = managedClubsData.map(m => ({
      id: m.club.id,
      name: m.club.name,
      logoUrl: m.club.logoUrl,
      shortDescription: m.club.shortDescription,
    }));

    // Get upcoming events (interested/confirmed/pending)
    const upcomingRegistrations = await this.registrationRepository.find({
      where: {
        userId,
        status: In([RegistrationStatus.INTERESTED, RegistrationStatus.CONFIRMED, RegistrationStatus.PENDING_PAYMENT]),
      },
      relations: ['event', 'event.club'],
      order: { createdAt: 'DESC' },
    });

    const upcomingEvents = upcomingRegistrations
      .filter(reg => reg.event && new Date(reg.event.startTime) >= now)
      .slice(0, 10)
      .map(reg => ({
        id: reg.event.id,
        title: reg.event.title,
        photoUrl: reg.event.photoUrl,
        startTime: reg.event.startTime,
        clubName: reg.event.club?.name || 'Unknown Club',
        status: reg.status,
      }));

    // Get past events (attended/confirmed past events)
    const pastRegistrations = await this.registrationRepository.find({
      where: {
        userId,
        status: In([RegistrationStatus.ATTENDED, RegistrationStatus.CONFIRMED]),
      },
      relations: ['event', 'event.club'],
      order: { updatedAt: 'DESC' },
    });

    const pastEvents = pastRegistrations
      .filter(reg => reg.event && new Date(reg.event.endTime) < now)
      .slice(0, 10)
      .map(reg => ({
        id: reg.event.id,
        title: reg.event.title,
        photoUrl: reg.event.photoUrl,
        startTime: reg.event.startTime,
        clubName: reg.event.club?.name || 'Unknown Club',
        status: reg.status,
      }));

    return {
      id: user.id,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      studentYear: user.studentYear,
      createdAt: user.createdAt,
      followedClubs,
      managedClubs,
      upcomingEvents,
      pastEvents,
    };
  }

  // Update user profile
  async updateProfile(userId: number, updateDto: UpdateProfileDto): Promise<UserProfileDto> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updateDto.fullName !== undefined) user.fullName = updateDto.fullName;
    if (updateDto.bio !== undefined) user.bio = updateDto.bio;
    if (updateDto.studentYear !== undefined) user.studentYear = updateDto.studentYear;
    if (updateDto.phoneNumber !== undefined) user.phoneNumber = updateDto.phoneNumber;
    if (updateDto.avatarUrl !== undefined) user.avatarUrl = updateDto.avatarUrl;

    await this.userRepository.save(user);

    return this.getProfile(userId);
  }

  // Get user's complete dashboard data
  async getDashboard(userId: number): Promise<UserDashboardDto> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const now = new Date();

    // Get all counts in parallel
    const [
      eventsAttended,
      upcomingRegistrations,
      clubsFollowed,
      ratingsGiven,
    ] = await Promise.all([
      this.registrationRepository.count({
        where: { userId, status: RegistrationStatus.ATTENDED },
      }),
      this.registrationRepository.count({
        where: {
          userId,
          status: In([RegistrationStatus.INTERESTED, RegistrationStatus.CONFIRMED]),
        },
      }),
      this.clubFollowerRepository.count({ where: { userId } }),
      this.eventRatingRepository.count({ where: { userId } }),
    ]);

    // Get user events
    const [upcomingEvents, recentEvents] = await Promise.all([
      this.getUserUpcomingEvents(userId),
      this.getUserRecentEvents(userId),
    ]);

    // Get followed clubs
    const followedClubs = await this.getFollowedClubs(userId);

    return {
      profile: await this.getProfile(userId),
      stats: {
        eventsAttended,
        eventsUpcoming: upcomingRegistrations,
        clubsFollowed,
        ratingsGiven,
      },
      upcomingEvents,
      recentEvents,
      followedClubs,
    };
  }

  // Get user's upcoming events (registered/interested)
  async getUserUpcomingEvents(userId: number, limit: number = 10): Promise<UserEventDto[]> {
    const now = new Date();

    const registrations = await this.registrationRepository.find({
      where: {
        userId,
        status: In([RegistrationStatus.INTERESTED, RegistrationStatus.CONFIRMED, RegistrationStatus.PENDING_PAYMENT]),
      },
      relations: ['event', 'event.club'],
      order: { createdAt: 'DESC' },
    });

    // Filter to only upcoming events and map
    return registrations
      .filter(reg => reg.event && new Date(reg.event.startTime) >= now)
      .slice(0, limit)
      .map(reg => this.mapToUserEventDto(reg, 'upcoming'));
  }

  // Get user's past/attended events
  async getUserRecentEvents(userId: number, limit: number = 10): Promise<UserEventDto[]> {
    const now = new Date();

    const registrations = await this.registrationRepository.find({
      where: {
        userId,
        status: In([RegistrationStatus.ATTENDED, RegistrationStatus.CONFIRMED]),
      },
      relations: ['event', 'event.club'],
      order: { updatedAt: 'DESC' },
    });

    // Filter to past events
    return registrations
      .filter(reg => reg.event && new Date(reg.event.endTime) < now)
      .slice(0, limit)
      .map(reg => this.mapToUserEventDto(reg, 'past'));
  }

  private mapToUserEventDto(registration: Registration, status: 'upcoming' | 'past'): UserEventDto {
    const event = registration.event;
    return {
      id: event.id,
      title: event.title,
      startTime: event.startTime,
      endTime: event.endTime,
      status,
      registrationStatus: registration.status,
      photoUrl: event.photoUrl,
      club: event.club ? {
        id: event.club.id,
        name: event.club.name,
        logoUrl: event.club.logoUrl,
      } : null,
    };
  }

  // Get user's followed clubs
  async getFollowedClubs(userId: number): Promise<FollowedClubDto[]> {
    const followers = await this.clubFollowerRepository.find({
      where: { userId },
      relations: ['club'],
      order: { createdAt: 'DESC' },
    });

    return followers.map(f => ({
      id: f.club.id,
      name: f.club.name,
      logoUrl: f.club.logoUrl,
      shortDescription: f.club.shortDescription,
      followedAt: f.createdAt,
    }));
  }

  // Check if user follows a club
  async isFollowingClub(userId: number, clubId: number): Promise<boolean> {
    const follow = await this.clubFollowerRepository.findOne({
      where: { userId, clubId },
    });
    return !!follow;
  }

  // Follow a club
  async followClub(userId: number, clubId: number): Promise<ClubFollower> {
    const club = await this.clubRepository.findOne({ where: { id: clubId } });
    if (!club) {
      throw new NotFoundException('Club not found');
    }

    // Check if already following
    const existing = await this.clubFollowerRepository.findOne({
      where: { userId, clubId },
    });

    if (existing) {
      return existing;
    }

    const follow = this.clubFollowerRepository.create({
      userId,
      clubId,
    });

    return this.clubFollowerRepository.save(follow);
  }

  // Unfollow a club
  async unfollowClub(userId: number, clubId: number): Promise<void> {
    const follow = await this.clubFollowerRepository.findOne({
      where: { userId, clubId },
    });

    if (follow) {
      await this.clubFollowerRepository.delete(follow.id);
    }
  }

  // Get user's ratings
  async getUserRatings(userId: number): Promise<UserRatingDto[]> {
    const ratings = await this.eventRatingRepository.find({
      where: { userId },
      relations: ['event'],
      order: { createdAt: 'DESC' },
    });

    return ratings.map(r => ({
      id: r.id,
      eventId: r.eventId,
      eventTitle: r.event?.title || 'Unknown Event',
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
    }));
  }

  // Get user's registration for a specific event
  async getEventRegistration(userId: number, eventId: number): Promise<Registration | null> {
    return this.registrationRepository.findOne({
      where: { userId, eventId },
    });
  }

  // Get all user's registrations
  async getAllRegistrations(userId: number): Promise<Registration[]> {
    return this.registrationRepository.find({
      where: { userId },
      relations: ['event', 'event.club'],
      order: { createdAt: 'DESC' },
    });
  }
}
