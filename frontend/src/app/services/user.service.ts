import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
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

/**
 * UserService - Pure data service for user-related HTTP operations
 *
 * Responsibilities:
 * - HTTP communication with user endpoints
 * - Data transformation (dates, image URLs)
 * - Authentication header management
 *
 * Does NOT manage:
 * - UI state (loading, error)
 * - Component state
 * - Caching or persistence
 */
@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly apiUrl = getApiUrl();
  private readonly tokenService = inject(TokenService);
  private readonly http = inject(HttpClient);

  /**
   * Authentication header factory - ensures secure API communication
   */
  private getAuthHeaders(): HttpHeaders {
    const token = this.tokenService.getAccessToken();
    if (!token) {
      throw new Error('Not authenticated');
    }
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    });
  }

  /**
   * Data transformation helpers - convert API responses to typed frontend models
   */
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

  // Public API methods - HTTP operations that return data without side effects

  /**
   * Fetches public user profile - no authentication required
   */
  getPublicProfile(userId: number): Observable<{
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
    return this.http.get<any>(`${this.apiUrl}/users/${userId}/profile`).pipe(
      map(data => ({
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
      }))
    );
  }

  /**
   * Fetches current authenticated user's profile
   */
  getProfile(): Observable<UserProfile> {
    return this.http.get<any>(`${this.apiUrl}/users/me`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(data => this.resolveProfileImages(data))
    );
  }

  /**
   * Updates current user's profile with provided data
   */
  updateProfile(updates: UpdateProfileRequest): Observable<UserProfile> {
    return this.http.put<any>(`${this.apiUrl}/users/me`, updates, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(data => this.resolveProfileImages(data))
    );
  }

  /**
   * Fetches complete dashboard data with all user information
   */
  getDashboard(): Observable<UserDashboard> {
    return this.http.get<any>(`${this.apiUrl}/users/me/dashboard`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(data => ({
        profile: this.resolveProfileImages(data.profile),
        stats: data.stats,
        upcomingEvents: data.upcomingEvents.map((e: any) => this.resolveEventImages(e)),
        recentEvents: data.recentEvents.map((e: any) => this.resolveEventImages(e)),
        followedClubs: data.followedClubs.map((c: any) => this.resolveClubImages(c)),
      }))
    );
  }

  /**
   * Fetches user's upcoming events only
   */
  getUpcomingEvents(): Observable<ProfileEvent[]> {
    return this.http.get<any[]>(`${this.apiUrl}/users/me/events/upcoming`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(data => data.map((e: any) => this.resolveEventImages(e)))
    );
  }

  /**
   * Fetches user's past events only
   */
  getPastEvents(): Observable<ProfileEvent[]> {
    return this.http.get<any[]>(`${this.apiUrl}/users/me/events/past`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(data => data.map((e: any) => this.resolveEventImages(e)))
    );
  }

  /**
   * Fetches clubs that the user follows
   */
  getFollowedClubs(): Observable<FollowedClub[]> {
    return this.http.get<any[]>(`${this.apiUrl}/users/me/clubs`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(data => data.map((c: any) => this.resolveClubImages(c)))
    );
  }

  /**
   * Follows a club - returns success status
   */
  followClub(clubId: number): Observable<boolean> {
    return this.http.post(`${this.apiUrl}/users/me/clubs/${clubId}/follow`, {}, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(() => true)
    );
  }

  /**
   * Unfollows a club - returns success status
   */
  unfollowClub(clubId: number): Observable<boolean> {
    return this.http.delete(`${this.apiUrl}/users/me/clubs/${clubId}/follow`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(() => true)
    );
  }

  /**
   * Checks if user is currently following a specific club
   */
  isFollowingClub(clubId: number): Observable<boolean> {
    return this.http.get<{ isFollowing: boolean }>(`${this.apiUrl}/users/me/clubs/${clubId}/following`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(data => data.isFollowing)
    );
  }

  /**
   * Fetches all ratings given by the user
   */
  getUserRatings(): Observable<UserRating[]> {
    return this.http.get<any[]>(`${this.apiUrl}/users/me/ratings`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(data => data.map((r: any) => ({
        ...r,
        createdAt: new Date(r.createdAt),
      })))
    );
  }

  /**
   * Fetches public ratings given by a specific user
   */
  getPublicUserRatings(userId: number): Observable<UserRating[]> {
    return this.http.get<any[]>(`${this.apiUrl}/users/${userId}/ratings`).pipe(
      map(data => data.map((r: any) => ({
        ...r,
        createdAt: new Date(r.createdAt),
      })))
    );
  }
}
