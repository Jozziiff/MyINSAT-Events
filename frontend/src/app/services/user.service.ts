import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
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
 */
@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly apiUrl = getApiUrl();
  private readonly http = inject(HttpClient);

  /**
   * Data transformation helpers
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

  getProfile(): Observable<UserProfile> {
    return this.http.get<any>(`${this.apiUrl}/users/me`).pipe(
      map(data => this.resolveProfileImages(data))
    );
  }

  updateProfile(updates: UpdateProfileRequest): Observable<UserProfile> {
    return this.http.put<any>(`${this.apiUrl}/users/me`, updates).pipe(
      map(data => this.resolveProfileImages(data))
    );
  }

  getDashboard(): Observable<UserDashboard> {
    return this.http.get<any>(`${this.apiUrl}/users/me/dashboard`).pipe(
      map(data => ({
        profile: this.resolveProfileImages(data.profile),
        stats: data.stats,
        upcomingEvents: data.upcomingEvents.map((e: any) => this.resolveEventImages(e)),
        recentEvents: data.recentEvents.map((e: any) => this.resolveEventImages(e)),
        followedClubs: data.followedClubs.map((c: any) => this.resolveClubImages(c)),
      }))
    );
  }

  getUpcomingEvents(): Observable<ProfileEvent[]> {
    return this.http.get<any[]>(`${this.apiUrl}/users/me/events/upcoming`).pipe(
      map(data => data.map((e: any) => this.resolveEventImages(e)))
    );
  }

  getPastEvents(): Observable<ProfileEvent[]> {
    return this.http.get<any[]>(`${this.apiUrl}/users/me/events/past`).pipe(
      map(data => data.map((e: any) => this.resolveEventImages(e)))
    );
  }

  getFollowedClubs(): Observable<FollowedClub[]> {
    return this.http.get<any[]>(`${this.apiUrl}/users/me/clubs`).pipe(
      map(data => data.map((c: any) => this.resolveClubImages(c)))
    );
  }

  followClub(clubId: number): Observable<boolean> {
    return this.http.post(`${this.apiUrl}/users/me/clubs/${clubId}/follow`, {}).pipe(
      map(() => true)
    );
  }

  unfollowClub(clubId: number): Observable<boolean> {
    return this.http.delete(`${this.apiUrl}/users/me/clubs/${clubId}/follow`).pipe(
      map(() => true)
    );
  }

  isFollowingClub(clubId: number): Observable<boolean> {
    return this.http.get<{ isFollowing: boolean }>(`${this.apiUrl}/users/me/clubs/${clubId}/following`).pipe(
      map(data => data.isFollowing)
    );
  }

  getUserRatings(): Observable<UserRating[]> {
    return this.http.get<any[]>(`${this.apiUrl}/users/me/ratings`).pipe(
      map(data => data.map((r: any) => ({
        ...r,
        createdAt: new Date(r.createdAt),
      })))
    );
  }

  getPublicUserRatings(userId: number): Observable<UserRating[]> {
    return this.http.get<any[]>(`${this.apiUrl}/users/${userId}/ratings`).pipe(
      map(data => data.map((r: any) => ({
        ...r,
        createdAt: new Date(r.createdAt),
      })))
    );
  }
}
