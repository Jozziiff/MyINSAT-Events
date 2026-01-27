import { UserRole } from '../../common/enums';

// Basic user info for public display
export interface PublicUserDto {
  id: number;
  fullName: string;
  avatarUrl: string | null;
}

// Full user profile for the owner
export interface UserProfileDto {
  id: number;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  bio: string | null;
  studentYear: string | null;
  phoneNumber: string | null;
  role: UserRole;
  emailVerified: boolean;
  createdAt: Date;
}

// User's event summary
export interface UserEventDto {
  id: number;
  title: string;
  startTime: Date;
  endTime: Date;
  status: 'upcoming' | 'past';
  registrationStatus: string;
  photoUrl: string | null;
  club: {
    id: number;
    name: string;
    logoUrl: string | null;
  } | null;
}

// User's followed club summary
export interface FollowedClubDto {
  id: number;
  name: string;
  logoUrl: string | null;
  shortDescription: string | null;
  followedAt: Date;
}

// User's rating for an event
export interface UserRatingDto {
  id: number;
  eventId: number;
  eventTitle: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
}

// Complete user dashboard data
export interface UserDashboardDto {
  profile: UserProfileDto;
  stats: {
    eventsAttended: number;
    eventsUpcoming: number;
    clubsFollowed: number;
    ratingsGiven: number;
  };
  upcomingEvents: UserEventDto[];
  recentEvents: UserEventDto[];
  followedClubs: FollowedClubDto[];
}
