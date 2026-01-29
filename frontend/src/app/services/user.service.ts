import { Injectable, signal, inject } from '@angular/core';
import { TokenService } from './auth/token';
import { 
  UserProfile, 
  UpdateProfileRequest, 
  UserDashboard, 
  ProfileEvent, 
  FollowedClub, 
  UserRating 
} from '../models/profile.models';
import { resolveImageUrl, getApiUrl } from '../utils/image.utils';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly apiUrl = getApiUrl();
  private readonly tokenService = inject(TokenService);

  // Signals for state management
  profile = signal<UserProfile | null>(null);
  dashboard = signal<UserDashboard | null>(null);
  upcomingEvents = signal<ProfileEvent[]>([]);
  pastEvents = signal<ProfileEvent[]>([]);
  followedClubs = signal<FollowedClub[]>([]);
  userRatings = signal<UserRating[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  private getAuthHeaders(): HeadersInit {
    const token = this.tokenService.getAccessToken();
    if (!token) {
      throw new Error('Not authenticated');
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  private resolveProfileImages(profile: any): UserProfile {
    return {
      ...profile,
      avatarUrl: resolveImageUrl(profile.avatarUrl),
      createdAt: new Date(profile.createdAt),
    };
  }

  private resolveEventImages(event: any): ProfileEvent {
    return {
      ...event,
      photoUrl: resolveImageUrl(event.photoUrl),
      startTime: new Date(event.startTime),
      endTime: new Date(event.endTime),
      clubName: event.club?.name || event.clubName,
      club: event.club ? {
        ...event.club,
        logoUrl: resolveImageUrl(event.club.logoUrl),
      } : null,
    };
  }

  private resolveClubImages(club: any): FollowedClub {
    return {
      ...club,
      logoUrl: resolveImageUrl(club.logoUrl),
      followedAt: new Date(club.followedAt),
    };
  }

  // Get public user profile (no auth required)
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
  } | null> {
    try {
      const response = await fetch(`${this.apiUrl}/users/${userId}/profile`);
      if (!response.ok) throw new Error('Failed to fetch user profile');
      const data = await response.json();
      return {
        ...data,
        avatarUrl: resolveImageUrl(data.avatarUrl),
        createdAt: new Date(data.createdAt),
        followedClubs: data.followedClubs.map((c: any) => ({
          ...c,
          logoUrl: resolveImageUrl(c.logoUrl),
        })),
        managedClubs: data.managedClubs.map((c: any) => ({
          ...c,
          logoUrl: resolveImageUrl(c.logoUrl),
        })),
        upcomingEvents: data.upcomingEvents.map((e: any) => ({
          ...e,
          photoUrl: resolveImageUrl(e.photoUrl),
          startTime: new Date(e.startTime),
        })),
        pastEvents: data.pastEvents.map((e: any) => ({
          ...e,
          photoUrl: resolveImageUrl(e.photoUrl),
          startTime: new Date(e.startTime),
        })),
      };
    } catch (err: any) {
      console.error('Error fetching public profile:', err);
      return null;
    }
  }

  // Get current user's profile
  async getProfile(): Promise<UserProfile | null> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const response = await fetch(`${this.apiUrl}/users/me`, {
        headers: this.getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch profile');
      const data = await response.json();
      const resolved = this.resolveProfileImages(data);
      this.profile.set(resolved);
      return resolved;
    } catch (err: any) {
      this.error.set(err?.message || 'Unknown error');
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  // Update current user's profile
  async updateProfile(updates: UpdateProfileRequest): Promise<UserProfile | null> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const response = await fetch(`${this.apiUrl}/users/me`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update profile');
      const data = await response.json();
      const resolved = this.resolveProfileImages(data);
      this.profile.set(resolved);
      return resolved;
    } catch (err: any) {
      this.error.set(err?.message || 'Unknown error');
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  // Get complete dashboard data
  async getDashboard(): Promise<UserDashboard | null> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const response = await fetch(`${this.apiUrl}/users/me/dashboard`, {
        headers: this.getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch dashboard');
      const data = await response.json();
      
      const resolved: UserDashboard = {
        profile: this.resolveProfileImages(data.profile),
        stats: data.stats,
        upcomingEvents: data.upcomingEvents.map((e: any) => this.resolveEventImages(e)),
        recentEvents: data.recentEvents.map((e: any) => this.resolveEventImages(e)),
        followedClubs: data.followedClubs.map((c: any) => this.resolveClubImages(c)),
      };
      
      this.dashboard.set(resolved);
      this.profile.set(resolved.profile);
      this.upcomingEvents.set(resolved.upcomingEvents);
      this.pastEvents.set(resolved.recentEvents);
      this.followedClubs.set(resolved.followedClubs);
      
      return resolved;
    } catch (err: any) {
      this.error.set(err?.message || 'Unknown error');
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  // Get user's upcoming events
  async getUpcomingEvents(): Promise<ProfileEvent[]> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const response = await fetch(`${this.apiUrl}/users/me/events/upcoming`, {
        headers: this.getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch upcoming events');
      const data = await response.json();
      const resolved = data.map((e: any) => this.resolveEventImages(e));
      this.upcomingEvents.set(resolved);
      return resolved;
    } catch (err: any) {
      this.error.set(err?.message || 'Unknown error');
      return [];
    } finally {
      this.loading.set(false);
    }
  }

  // Get user's past events
  async getPastEvents(): Promise<ProfileEvent[]> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const response = await fetch(`${this.apiUrl}/users/me/events/past`, {
        headers: this.getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch past events');
      const data = await response.json();
      const resolved = data.map((e: any) => this.resolveEventImages(e));
      this.pastEvents.set(resolved);
      return resolved;
    } catch (err: any) {
      this.error.set(err?.message || 'Unknown error');
      return [];
    } finally {
      this.loading.set(false);
    }
  }

  // Get user's followed clubs
  async getFollowedClubs(): Promise<FollowedClub[]> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const response = await fetch(`${this.apiUrl}/users/me/clubs`, {
        headers: this.getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch followed clubs');
      const data = await response.json();
      const resolved = data.map((c: any) => this.resolveClubImages(c));
      this.followedClubs.set(resolved);
      return resolved;
    } catch (err: any) {
      this.error.set(err?.message || 'Unknown error');
      return [];
    } finally {
      this.loading.set(false);
    }
  }

  // Follow a club
  async followClub(clubId: number): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/users/me/clubs/${clubId}/follow`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to follow club');
      // Refresh followed clubs
      await this.getFollowedClubs();
      return true;
    } catch (err: any) {
      this.error.set(err?.message || 'Unknown error');
      return false;
    }
  }

  // Unfollow a club
  async unfollowClub(clubId: number): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/users/me/clubs/${clubId}/follow`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });
      if (!response.ok && response.status !== 204) throw new Error('Failed to unfollow club');
      // Update local state
      this.followedClubs.update(clubs => clubs.filter(c => c.id !== clubId));
      return true;
    } catch (err: any) {
      this.error.set(err?.message || 'Unknown error');
      return false;
    }
  }

  // Check if following a club
  async isFollowingClub(clubId: number): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/users/me/clubs/${clubId}/following`, {
        headers: this.getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to check follow status');
      const data = await response.json();
      return data.isFollowing;
    } catch (err: any) {
      this.error.set(err?.message || 'Unknown error');
      return false;
    }
  }

  // Get user's ratings
  async getUserRatings(): Promise<UserRating[]> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const response = await fetch(`${this.apiUrl}/users/me/ratings`, {
        headers: this.getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch ratings');
      const data = await response.json();
      const resolved = data.map((r: any) => ({
        ...r,
        createdAt: new Date(r.createdAt),
      }));
      this.userRatings.set(resolved);
      return resolved;
    } catch (err: any) {
      this.error.set(err?.message || 'Unknown error');
      return [];
    } finally {
      this.loading.set(false);
    }
  }

  // Clear all user data (on logout)
  clearUserData(): void {
    this.profile.set(null);
    this.dashboard.set(null);
    this.upcomingEvents.set([]);
    this.pastEvents.set([]);
    this.followedClubs.set([]);
    this.userRatings.set([]);
    this.error.set(null);
  }
}
