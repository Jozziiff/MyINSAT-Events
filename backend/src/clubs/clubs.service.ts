import { Injectable, ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Club } from '../entities/club.entity';
import { Event } from '../entities/event.entity';
import { Registration } from '../entities/registration.entity';
import { ClubFollower } from '../entities/club-follower.entity';
import { ClubManager } from '../entities/club-manager.entity';
import { ClubJoinRequest } from '../entities/club-join-request.entity';
import { EventRating } from '../entities/event-rating.entity';
import { RegistrationStatus, ClubStatus, JoinRequestStatus } from '../common/enums';
import { ClubDto, ClubSummaryDto } from './dto/club.dto';
import { CreateClubDto, DEFAULT_SECTION_IMAGES } from './dto/create-club.dto';


@Injectable()
export class ClubsService {
  constructor(
    @InjectRepository(Club)
    private readonly clubRepository: Repository<Club>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(ClubFollower)
    private readonly clubFollowerRepository: Repository<ClubFollower>,
    @InjectRepository(ClubManager)
    private readonly clubManagerRepository: Repository<ClubManager>,
    @InjectRepository(ClubJoinRequest)
    private readonly joinRequestRepository: Repository<ClubJoinRequest>,
    @InjectRepository(EventRating)
    private readonly eventRatingRepository: Repository<EventRating>,
  ) { }

  private applyDefaultImages(club: any): any {
    return {
      ...club,
      aboutImageUrl: club.aboutImageUrl || DEFAULT_SECTION_IMAGES.about,
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

  async getAllClubs(): Promise<ClubSummaryDto[]> {
    const clubs = await this.clubRepository.find({
      where: { status: ClubStatus.APPROVED },
      select: ['id', 'name', 'shortDescription', 'logoUrl'],
    });

    return clubs.map((club) => ({
      id: club.id,
      name: club.name,
      shortDescription: club.shortDescription,
      logoUrl: club.logoUrl
    }));
  }

  // Get full club details by ID
  async getClubById(id: number): Promise<ClubDto | undefined> {
    const club = await this.clubRepository.findOne({ where: { id } });
    if (!club) return undefined;
    return this.applyDefaultImages(club);
  }

  // Create a new club
  async createClub(
    createClubDto: CreateClubDto,
    userId: number,
  ): Promise<ClubDto> {
    try {
      // Check if club name already exists (only check APPROVED and PENDING clubs, allow reuse of REJECTED names)
      const existingClub = await this.clubRepository.findOne({
        where: {
          name: createClubDto.name,
          status: In([ClubStatus.APPROVED, ClubStatus.PENDING]),
        },
      });

      if (existingClub) {
        throw new ConflictException(`A club with the name "${createClubDto.name}" already exists`);
      }

      const newClub = this.clubRepository.create({
        ...createClubDto,
        status: ClubStatus.PENDING, // Clubs need admin approval
      });

      const savedClub = await this.clubRepository.save(newClub);

      // Create club_managers record immediately to track who created it
      const clubManager = this.clubManagerRepository.create({
        userId: userId,
        clubId: savedClub.id,
      });
      await this.clubManagerRepository.save(clubManager);

      return this.applyDefaultImages(savedClub);
    } catch (error) {
      throw error;
    }
  }

  async updateClub(
    id: number,
    updateData: Partial<CreateClubDto>,
    userId: number,
    userRole: string,
  ): Promise<ClubDto | null> {
    const club = await this.clubRepository.findOne({
      where: { id },
      relations: ['managers'],
    });
    if (!club) return null;

    const isManager = club.managers?.some(m => m.userId === userId);
    const isAdmin = userRole === 'ADMIN';

    if (!isManager && !isAdmin) {
      throw new ForbiddenException('Only a club manager or admin can update this club');
    }

    Object.assign(club, updateData);
    const updatedClub = await this.clubRepository.save(club);
    return this.applyDefaultImages(updatedClub);
  }

  async deleteClub(
    id: number,
    userId: number,
    userRole: string,
  ): Promise<boolean> {
    const club = await this.clubRepository.findOne({
      where: { id },
      relations: ['managers'],
    });
    if (!club) return false;

    const isManager = club.managers?.some(m => m.userId === userId);
    const isAdmin = userRole === 'ADMIN';

    if (!isManager && !isAdmin) {
      throw new ForbiddenException('Only the club manager or admin can delete this club');
    }

    await this.clubRepository.delete(id);
    return true;
  }

  async getClubEventsWithStats(clubId: number): Promise<{
    events: any[];
    statistics: {
      totalEvents: number;
      totalAttendance: number;
      averageAttendanceRate: number;
      averageRating: number;
    };
  } | null> {
    // Check if club exists
    const club = await this.clubRepository.findOne({ where: { id: clubId } });
    if (!club) return null;

    // Get past events for this club with registrations and ratings
    const events = await this.eventRepository.find({
      where: { clubId },
      relations: ['registrations', 'ratings'],
      order: { startTime: 'DESC' },
    });

    // Filter to past events only
    const now = new Date();
    const pastEvents = events.filter(e => new Date(e.endTime) < now);

    const eventsWithStats = pastEvents.map(event => {
      const registrations = event.registrations || [];
      const ratings = event.ratings || [];
      const attendedCount = registrations.filter(r => r.status === RegistrationStatus.ATTENDED).length;
      const attendanceRate = registrations.length > 0
        ? Math.round((attendedCount / registrations.length) * 100)
        : 0;

      // Calculate average rating for this event
      const averageRating = ratings.length > 0
        ? Math.round((ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length) * 10) / 10
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
        registrationsCount: registrations.length,
        attendedCount,
        attendanceRate,
        ratingsCount: ratings.length,
        averageRating,
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

    // Calculate club average rating across all events
    const allRatings = pastEvents.flatMap(e => e.ratings || []);
    const clubAverageRating = allRatings.length > 0
      ? Math.round((allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length) * 10) / 10
      : 0;

    return {
      events: eventsWithStats,
      statistics: {
        totalEvents: pastEvents.length,
        totalAttendance,
        averageAttendanceRate: clubAverageAttendanceRate,
        averageRating: clubAverageRating,
      },
    };
  }

  async getFollowerCount(clubId: number): Promise<number> {
    return this.clubFollowerRepository.count({ where: { clubId } });
  }

  // Get club followers list
  async getFollowers(clubId: number): Promise<{ id: number; fullName: string; avatarUrl: string | null }[]> {
    const club = await this.clubRepository.findOne({ where: { id: clubId } });
    if (!club) {
      throw new NotFoundException('Club not found');
    }

    const followers = await this.clubFollowerRepository.find({
      where: { clubId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    return followers.map(f => ({
      id: f.user.id,
      fullName: f.user.fullName,
      avatarUrl: f.user.avatarUrl,
    }));
  }

  // Check if user follows club
  async isFollowing(userId: number, clubId: number): Promise<boolean> {
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

  // Get club with follow status and stats
  async getClubWithStats(clubId: number, userId?: number): Promise<ClubDto & {
    followerCount: number;
    isFollowing: boolean;
    upcomingEventsCount: number;
  } | null> {
    const club = await this.getClubById(clubId);
    if (!club) return null;

    const now = new Date();
    const [followerCount, isFollowing, upcomingEvents] = await Promise.all([
      this.getFollowerCount(clubId),
      userId ? this.isFollowing(userId, clubId) : false,
      this.eventRepository.count({
        where: {
          clubId,
          startTime: new Date(now.getTime()),
        },
      }),
    ]);

    return {
      ...club,
      followerCount,
      isFollowing,
      upcomingEventsCount: upcomingEvents,
    };
  }

  // ============ JOIN REQUEST METHODS ============

  // Submit a join request to a club
  async submitJoinRequest(userId: number, clubId: number): Promise<ClubJoinRequest> {
    // Check if club exists
    const club = await this.clubRepository.findOne({ where: { id: clubId } });
    if (!club) {
      throw new NotFoundException(`Club with ID ${clubId} not found`);
    }

    // Check if user is already a manager
    const isManager = await this.clubManagerRepository.findOne({
      where: { userId, clubId },
    });
    if (isManager) {
      throw new ConflictException('You are already a manager of this club');
    }

    // Check if request already exists
    const existingRequest = await this.joinRequestRepository.findOne({
      where: { userId, clubId },
    });
    if (existingRequest) {
      if (existingRequest.status === JoinRequestStatus.PENDING) {
        throw new ConflictException('You already have a pending request for this club');
      }
      if (existingRequest.status === JoinRequestStatus.APPROVED) {
        throw new ConflictException('You are already a member of this club');
      }
      // If rejected, allow reapplication by updating the status
      existingRequest.status = JoinRequestStatus.PENDING;
      existingRequest.updatedAt = new Date();
      return this.joinRequestRepository.save(existingRequest);
    }

    const joinRequest = this.joinRequestRepository.create({
      userId,
      clubId,
      status: JoinRequestStatus.PENDING,
    });

    return this.joinRequestRepository.save(joinRequest);
  }

  // Get pending join requests for a club (for managers)
  async getClubJoinRequests(clubId: number, userId: number): Promise<any[]> {
    // Verify user is a manager of this club
    const isManager = await this.clubManagerRepository.findOne({
      where: { userId, clubId },
    });
    if (!isManager) {
      throw new ForbiddenException('Only club managers can view join requests');
    }

    const requests = await this.joinRequestRepository.find({
      where: { clubId, status: JoinRequestStatus.PENDING },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    return requests.map(req => ({
      id: req.id,
      userId: req.userId,
      clubId: req.clubId,
      status: req.status,
      createdAt: req.createdAt,
      user: {
        id: req.user.id,
        fullName: req.user.fullName,
        email: req.user.email,
        avatarUrl: req.user.avatarUrl,
      },
    }));
  }

  // Approve a join request (add user as manager)
  async approveJoinRequest(requestId: number, managerId: number): Promise<ClubJoinRequest> {
    const request = await this.joinRequestRepository.findOne({
      where: { id: requestId },
      relations: ['club'],
    });

    if (!request) {
      throw new NotFoundException(`Join request with ID ${requestId} not found`);
    }

    // Verify the approver is a manager
    const isManager = await this.clubManagerRepository.findOne({
      where: { userId: managerId, clubId: request.clubId },
    });
    if (!isManager) {
      throw new ForbiddenException('Only club managers can approve requests');
    }

    // Update request status
    request.status = JoinRequestStatus.APPROVED;
    await this.joinRequestRepository.save(request);

    // Add user as a manager
    const clubManager = this.clubManagerRepository.create({
      userId: request.userId,
      clubId: request.clubId,
    });
    await this.clubManagerRepository.save(clubManager);

    return request;
  }

  // Reject a join request
  async rejectJoinRequest(requestId: number, managerId: number): Promise<ClubJoinRequest> {
    const request = await this.joinRequestRepository.findOne({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException(`Join request with ID ${requestId} not found`);
    }

    // Verify the rejector is a manager
    const isManager = await this.clubManagerRepository.findOne({
      where: { userId: managerId, clubId: request.clubId },
    });
    if (!isManager) {
      throw new ForbiddenException('Only club managers can reject requests');
    }

    request.status = JoinRequestStatus.REJECTED;
    return this.joinRequestRepository.save(request);
  }

  // Get user's join request status for a club
  async getUserJoinRequestStatus(userId: number, clubId: number): Promise<JoinRequestStatus | null> {
    const request = await this.joinRequestRepository.findOne({
      where: { userId, clubId },
    });
    return request?.status || null;
  }

  // Get all clubs with user's join status
  async getAllClubsWithJoinStatus(userId: number): Promise<(ClubSummaryDto & {
    joinRequestStatus: JoinRequestStatus | null;
    isManager: boolean;
  })[]> {
    const clubs = await this.clubRepository.find({
      where: { status: ClubStatus.APPROVED },
      select: ['id', 'name', 'shortDescription', 'logoUrl'],
    });

    // Get user's join requests
    const userRequests = await this.joinRequestRepository.find({
      where: { userId },
    });
    const requestMap = new Map(userRequests.map(r => [r.clubId, r.status]));

    // Get user's managed clubs
    const managedClubs = await this.clubManagerRepository.find({
      where: { userId },
    });
    const managedClubIds = new Set(managedClubs.map(m => m.clubId));

    return clubs.map(club => ({
      id: club.id,
      name: club.name,
      shortDescription: club.shortDescription,
      logoUrl: club.logoUrl,
      joinRequestStatus: requestMap.get(club.id) || null,
      isManager: managedClubIds.has(club.id),
    }));
  }

  // Get user's managed clubs with their status (for profile page)
  async getUserManagedClubs(userId: number): Promise<{
    id: number;
    name: string;
    shortDescription: string;
    logoUrl: string;
    status: ClubStatus;
    createdAt: Date;
  }[]> {
    const managedClubs = await this.clubManagerRepository.find({
      where: { userId },
      relations: ['club'],
    });

    // Sort by club's createdAt descending
    return managedClubs
      .sort((a, b) => new Date(b.club.createdAt).getTime() - new Date(a.club.createdAt).getTime())
      .map(m => ({
        id: m.club.id,
        name: m.club.name,
        shortDescription: m.club.shortDescription,
        logoUrl: m.club.logoUrl,
        status: m.club.status,
        createdAt: m.club.createdAt,
      }));
  }

  // Check if user can view a club (for pending clubs, only admin/manager can view)
  async canUserViewClub(clubId: number, userId?: number, userRole?: string): Promise<boolean> {
    const club = await this.clubRepository.findOne({ where: { id: clubId } });
    if (!club) return false;

    // Approved clubs are visible to everyone
    if (club.status === ClubStatus.APPROVED) return true;

    // If no user, cannot view pending/rejected clubs
    if (!userId) return false;

    // Admin can view all clubs
    if (userRole === 'ADMIN') return true;

    // Manager of the club can view it
    const isManager = await this.clubManagerRepository.findOne({
      where: { userId, clubId },
    });
    return !!isManager;
  }

  // Get club with access check
  async getClubWithAccessCheck(
    clubId: number,
    userId?: number,
    userRole?: string,
  ): Promise<(ClubDto & {
    followerCount: number;
    isFollowing: boolean;
    upcomingEventsCount: number;
    isManager: boolean;
  }) | null> {
    const club = await this.clubRepository.findOne({ where: { id: clubId } });
    if (!club) return null;

    // Check access for non-approved clubs
    if (club.status !== ClubStatus.APPROVED) {
      const canView = await this.canUserViewClub(clubId, userId, userRole);
      if (!canView) return null;
    }

    const now = new Date();
    const [followerCount, isFollowing, upcomingEvents, isManager] = await Promise.all([
      this.getFollowerCount(clubId),
      userId ? this.isFollowing(userId, clubId) : false,
      this.eventRepository.count({
        where: {
          clubId,
          startTime: new Date(now.getTime()),
        },
      }),
      userId ? this.clubManagerRepository.findOne({ where: { userId, clubId } }).then(m => !!m) : false,
    ]);

    return {
      ...this.applyDefaultImages(club),
      followerCount,
      isFollowing,
      upcomingEventsCount: upcomingEvents,
      isManager,
    };
  }
}
