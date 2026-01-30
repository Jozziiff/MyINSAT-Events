import { RegistrationStatus } from './event.model';

// User role enum
export enum UserRole {
  USER = 'USER',
  MANAGER = 'MANAGER',
  ADMIN = 'ADMIN',
}

// Basic user profile for display
export interface UserProfile {
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

// Update profile request
export interface UpdateProfileRequest {
  fullName?: string;
  bio?: string;
  studentYear?: string;
  phoneNumber?: string;
  avatarUrl?: string;
}

// User's event in their dashboard
export interface ProfileEvent {
  id: number;
  title: string;
  startTime: Date;
  endTime: Date;
  status: 'upcoming' | 'past' | 'attended';
  registrationStatus: RegistrationStatus;
  photoUrl: string | null;
  clubName?: string;
  userRating?: number; // User's rating if they've rated the event
  club: {
    id: number;
    name: string;
    logoUrl: string | null;
  } | null;
}

// Followed club summary
export interface FollowedClub {
  id: number;
  name: string;
  logoUrl: string | null;
  shortDescription: string | null;
  followedAt: Date;
}

// User's rating for an event
export interface UserRating {
  id: number;
  eventId: number;
  eventTitle: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
}

// Dashboard statistics
export interface UserStats {
  eventsAttended: number;
  eventsUpcoming: number;
  clubsFollowed: number;
  ratingsGiven: number;
}

// Complete user dashboard data
export interface UserDashboard {
  profile: UserProfile;
  stats: UserStats;
  upcomingEvents: ProfileEvent[];
  recentEvents: ProfileEvent[];
  followedClubs: FollowedClub[];
}
