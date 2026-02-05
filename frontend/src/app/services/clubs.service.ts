import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Club, ClubSection, ClubSummary, CreateClubDto, ClubWithStats, ClubFollower, ClubWithJoinStatus, JoinRequest, ManagedClub } from '../models/club.model';
import { resolveImageUrl, getApiUrl } from '../utils/image.utils';

@Injectable({
  providedIn: 'root'
})
export class ClubsService {
  private readonly apiUrl = getApiUrl();
  private readonly http = inject(HttpClient);

  clubs = signal<ClubSummary[]>([]);
  selectedClub = signal<ClubWithStats | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  // Normalize single image field
  private resolveField(url?: string): string {
    return resolveImageUrl(url) || '';
  }

  // Normalize section objects with imageUrl
  private resolveSection(section?: ClubSection): any | undefined {
    if (!section) return undefined;

    return {
      ...section,
      imageUrl: resolveImageUrl(section.imageUrl),
    };
  }

  // Resolve all image URLs in a club object
  private resolveClubImages(club: Club): Club {
    return {
      ...club,
      logoUrl: resolveImageUrl(club.logoUrl) || '',
      coverImageUrl: resolveImageUrl(club.coverImageUrl) || '',
      aboutImageUrl: resolveImageUrl(club.aboutImageUrl) || '',
      history: this.resolveSection(club.history),
      mission: this.resolveSection(club.mission),
      activities: this.resolveSection(club.activities),
      achievements: this.resolveSection(club.achievements),
      joinUs: this.resolveSection(club.joinUs),
    };
  }

  private resolveClubSummaryImages(club: ClubSummary): ClubSummary {
    return {
      ...club,
      logoUrl: this.resolveField(club.logoUrl),
      coverImageUrl: resolveImageUrl(club.coverImageUrl),
    };
  }

  async getAllClubs(): Promise<ClubSummary[]> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const data = await firstValueFrom(this.http.get<ClubSummary[]>(`${this.apiUrl}/clubs`));
      const resolved = data.map(this.resolveClubSummaryImages.bind(this));
      this.clubs.set(resolved);
      return resolved;
    } catch (err: any) {
      this.error.set(err?.error?.message || err?.message || 'Unknown error');
      return [];
    } finally {
      this.loading.set(false);
    }
  }

  async getClubById(id: number): Promise<ClubWithStats | null> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const data = await firstValueFrom(this.http.get<any>(`${this.apiUrl}/clubs/${id}`));
      const resolved = {
        ...this.resolveClubImages(data),
        followerCount: data.followerCount || 0,
        isFollowing: data.isFollowing || false,
        upcomingEventsCount: data.upcomingEventsCount || 0,
      } as ClubWithStats;
      this.selectedClub.set(resolved);
      return resolved;
    } catch (err: any) {
      this.error.set(err?.error?.message || err?.message || 'Unknown error');
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  async createClub(clubData: CreateClubDto): Promise<Club | null> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const data = await firstValueFrom(this.http.post<Club>(`${this.apiUrl}/clubs`, clubData));
      const resolved = this.resolveClubImages(data);
      await this.getAllClubs();
      return resolved;
    } catch (err: any) {
      this.error.set(err?.error?.message || err?.message || 'Failed to create club');
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  async updateClub(id: number, clubData: CreateClubDto): Promise<Club | null> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const data = await firstValueFrom(this.http.put<Club>(`${this.apiUrl}/clubs/${id}`, clubData));
      const resolved = this.resolveClubImages(data);
      await this.getAllClubs();
      return resolved;
    } catch (err: any) {
      this.error.set(err?.error?.message || err?.message || 'Failed to update club');
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  async uploadImage(file: File): Promise<string | null> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('context', 'clubs');
      const data = await firstValueFrom(this.http.post<{ url: string }>(`${this.apiUrl}/upload/image`, formData));
      return resolveImageUrl(data.url) || null;
    } catch (err) {
      this.error.set('Failed to upload image');
      return null;
    }
  }

  async getClubEvents(clubId: number): Promise<any> {
    try {
      this.loading.set(true);
      const data = await firstValueFrom(this.http.get<any>(`${this.apiUrl}/clubs/${clubId}/events`));
      return data;
    } catch (err: any) {
      this.error.set(err?.error?.message || err?.message || 'Failed to load events');
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  async followClub(clubId: number): Promise<boolean> {
    try {
      await firstValueFrom(this.http.post(`${this.apiUrl}/clubs/${clubId}/follow`, {}));

      this.selectedClub.update(club => {
        if (club && club.id === clubId) {
          return {
            ...club,
            isFollowing: true,
            followerCount: club.followerCount + 1,
          };
        }
        return club;
      });

      return true;
    } catch (err: any) {
      this.error.set(err?.error?.message || err?.message || 'Unknown error');
      return false;
    }
  }

  async unfollowClub(clubId: number): Promise<boolean> {
    try {
      await firstValueFrom(this.http.delete(`${this.apiUrl}/clubs/${clubId}/follow`));

      this.selectedClub.update(club => {
        if (club && club.id === clubId) {
          return {
            ...club,
            isFollowing: false,
            followerCount: Math.max(0, club.followerCount - 1),
          };
        }
        return club;
      });

      return true;
    } catch (err: any) {
      this.error.set(err?.error?.message || err?.message || 'Unknown error');
      return false;
    }
  }

  async isFollowing(clubId: number): Promise<boolean> {
    try {
      const data = await firstValueFrom(this.http.get<{ isFollowing: boolean }>(`${this.apiUrl}/clubs/${clubId}/following`));
      return data.isFollowing;
    } catch (err) {
      return false;
    }
  }

  async getFollowers(clubId: number): Promise<ClubFollower[]> {
    try {
      const data = await firstValueFrom(this.http.get<any[]>(`${this.apiUrl}/clubs/${clubId}/followers`));
      return data.map((f: any) => ({
        ...f,
        avatarUrl: resolveImageUrl(f.avatarUrl),
      }));
    } catch (err: any) {
      this.error.set(err?.error?.message || err?.message || 'Unknown error');
      return [];
    }
  }

  async getAllClubsWithJoinStatus(): Promise<ClubWithJoinStatus[]> {
    try {
      const data = await firstValueFrom(this.http.get<any[]>(`${this.apiUrl}/clubs/join/status`));
      return data.map((c: any) => ({
        ...c,
        logoUrl: resolveImageUrl(c.logoUrl) || '',
      }));
    } catch (err: any) {
      this.error.set(err?.error?.message || err?.message || 'Unknown error');
      return [];
    }
  }

  async submitJoinRequest(clubId: number): Promise<boolean> {
    try {
      await firstValueFrom(this.http.post(`${this.apiUrl}/clubs/${clubId}/join`, {}));
      return true;
    } catch (err: any) {
      this.error.set(err?.error?.message || err?.message || 'Unknown error');
      return false;
    }
  }

  async getClubJoinRequests(clubId: number): Promise<JoinRequest[]> {
    try {
      const data = await firstValueFrom(this.http.get<any[]>(`${this.apiUrl}/clubs/${clubId}/join-requests`));
      return data.map((r: any) => ({
        ...r,
        user: {
          ...r.user,
          avatarUrl: resolveImageUrl(r.user.avatarUrl),
        },
      }));
    } catch (err: any) {
      this.error.set(err?.error?.message || err?.message || 'Unknown error');
      return [];
    }
  }

  async approveJoinRequest(requestId: number): Promise<boolean> {
    try {
      await firstValueFrom(this.http.post(`${this.apiUrl}/clubs/join-requests/${requestId}/approve`, {}));
      return true;
    } catch (err: any) {
      this.error.set(err?.error?.message || err?.message || 'Unknown error');
      return false;
    }
  }

  async rejectJoinRequest(requestId: number): Promise<boolean> {
    try {
      await firstValueFrom(this.http.post(`${this.apiUrl}/clubs/join-requests/${requestId}/reject`, {}));
      return true;
    } catch (err: any) {
      this.error.set(err?.error?.message || err?.message || 'Unknown error');
      return false;
    }
  }

  async getManagedClubs(): Promise<ManagedClub[]> {
    try {
      const data = await firstValueFrom(this.http.get<any[]>(`${this.apiUrl}/clubs/managed/me`));
      return data.map((c: any) => ({
        ...c,
        logoUrl: resolveImageUrl(c.logoUrl) || '',
        createdAt: new Date(c.createdAt),
      }));
    } catch (err: any) {
      this.error.set(err?.error?.message || err?.message || 'Unknown error');
      return [];
    }
  }
}
