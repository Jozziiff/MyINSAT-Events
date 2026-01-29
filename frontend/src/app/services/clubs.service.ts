import { Injectable, signal, inject } from '@angular/core';
import { Club, ClubSection, ClubSummary, CreateClubDto, ClubWithStats, ClubFollower, ClubWithJoinStatus, JoinRequest, JoinRequestStatus, ManagedClub, ClubStatus } from '../models/club.model';
import { TokenService } from './auth/token';
import { getApiUrl } from '../utils/image.utils';

@Injectable({
  providedIn: 'root'
})
export class ClubsService {
  private readonly apiUrl = getApiUrl();
  private readonly tokenService = inject(TokenService);

  clubs = signal<ClubSummary[]>([]);
  selectedClub = signal<ClubWithStats | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  private getAuthHeaders(): HeadersInit {
    const token = this.tokenService.getAccessToken();
    if (token) {
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };
    }
    return { 'Content-Type': 'application/json' };
  }

  private resolveImageUrl(url?: string): string | undefined {
    if (!url) return undefined;
    return url.startsWith('http://') || url.startsWith('https://')
      ? url
      : `${this.apiUrl}${url}`;
  }

  // Normalize single image field
  private resolveField(url?: string): string {
    return this.resolveImageUrl(url) || '';
  }

  // Normalize section objects with imageUrl
  private resolveSection(section?: ClubSection): any | undefined {
    if (!section) return undefined;

    return {
      ...section,
      imageUrl: this.resolveImageUrl(section.imageUrl),
    };
  }

  // Resolve all image URLs in a club object
  private resolveClubImages(club: Club): Club {
    return {
      ...club,
      logoUrl: this.resolveImageUrl(club.logoUrl) || '',
      coverImageUrl: this.resolveImageUrl(club.coverImageUrl) || '',
      aboutImageUrl: this.resolveImageUrl(club.aboutImageUrl) || '',
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
    };
  }

  async getAllClubs(): Promise<ClubSummary[]> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const response = await fetch(`${this.apiUrl}/clubs`);
      if (!response.ok) throw new Error('Failed to fetch clubs');
      const data: ClubSummary[] = await response.json();
      const resolved = data.map(this.resolveClubSummaryImages.bind(this));
      this.clubs.set(resolved);
      return resolved;
    } catch (err: any) {
      this.error.set(err?.message || 'Unknown error');
      return [];
    } finally {
      this.loading.set(false);
    }
  }

  async getClubById(id: number): Promise<ClubWithStats | null> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const response = await fetch(`${this.apiUrl}/clubs/${id}`, {
        headers: this.getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch club details');
      const data = await response.json();
      const resolved = {
        ...this.resolveClubImages(data),
        followerCount: data.followerCount || 0,
        isFollowing: data.isFollowing || false,
        upcomingEventsCount: data.upcomingEventsCount || 0,
      } as ClubWithStats;
      this.selectedClub.set(resolved);
      return resolved;
    } catch (err: any) {
      this.error.set(err?.message || 'Unknown error');
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  async createClub(clubData: CreateClubDto): Promise<Club | null> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const response = await fetch(`${this.apiUrl}/clubs`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(clubData),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to create club');
      }
      const data: Club = await response.json();
      const resolved = this.resolveClubImages(data);
      await this.getAllClubs();
      return resolved;
    } catch (err: any) {
      this.error.set(err?.message || 'Unknown error');
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  async updateClub(id: number, clubData: CreateClubDto): Promise<Club | null> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const response = await fetch(`${this.apiUrl}/clubs/${id}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(clubData),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to update club');
      }
      const data: Club = await response.json();
      const resolved = this.resolveClubImages(data);
      await this.getAllClubs();
      return resolved;
    } catch (err: any) {
      this.error.set(err?.message || 'Unknown error');
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
      const response = await fetch(`${this.apiUrl}/upload/image`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Failed to upload image');
      const data = await response.json();
      return this.resolveImageUrl(data.url) || null;
    } catch (err) {
      this.error.set('Failed to upload image');
      return null;
    }
  }

  // Get club events with statistics
  async getClubEvents(clubId: number): Promise<any> {
    try {
      this.loading.set(true);
      const response = await fetch(`${this.apiUrl}/clubs/${clubId}/events`);
      if (!response.ok) throw new Error('Failed to fetch club events');
      const data = await response.json();
      return data;
    } catch (err: any) {
      this.error.set(err?.message || 'Failed to load events');
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  // Follow a club
  async followClub(clubId: number): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/clubs/${clubId}/follow`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to follow club');

      // Update local state
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
      this.error.set(err?.message || 'Unknown error');
      return false;
    }
  }

  // Unfollow a club
  async unfollowClub(clubId: number): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/clubs/${clubId}/follow`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });
      if (!response.ok && response.status !== 204) throw new Error('Failed to unfollow club');

      // Update local state
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
      this.error.set(err?.message || 'Unknown error');
      return false;
    }
  }

  // Check if following a club
  async isFollowing(clubId: number): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/clubs/${clubId}/following`, {
        headers: this.getAuthHeaders(),
      });
      if (!response.ok) return false;
      const data = await response.json();
      return data.isFollowing;
    } catch (err) {
      return false;
    }
  }

  // Get club followers list
  async getFollowers(clubId: number): Promise<ClubFollower[]> {
    try {
      const response = await fetch(`${this.apiUrl}/clubs/${clubId}/followers`);
      if (!response.ok) throw new Error('Failed to fetch followers');
      const data = await response.json();
      return data.map((f: any) => ({
        ...f,
        avatarUrl: this.resolveImageUrl(f.avatarUrl),
      }));
    } catch (err: any) {
      this.error.set(err?.message || 'Unknown error');
      return [];
    }
  }

  // ============ JOIN REQUEST METHODS ============

  // Get all clubs with join status for current user
  async getAllClubsWithJoinStatus(): Promise<ClubWithJoinStatus[]> {
    try {
      const response = await fetch(`${this.apiUrl}/clubs/join/status`, {
        headers: this.getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch clubs');
      const data = await response.json();
      return data.map((c: any) => ({
        ...c,
        logoUrl: this.resolveImageUrl(c.logoUrl) || '',
      }));
    } catch (err: any) {
      this.error.set(err?.message || 'Unknown error');
      return [];
    }
  }

  // Submit a join request to a club
  async submitJoinRequest(clubId: number): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/clubs/${clubId}/join`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to submit join request');
      }
      return true;
    } catch (err: any) {
      this.error.set(err?.message || 'Unknown error');
      return false;
    }
  }

  // Get pending join requests for a club (for managers)
  async getClubJoinRequests(clubId: number): Promise<JoinRequest[]> {
    try {
      const response = await fetch(`${this.apiUrl}/clubs/${clubId}/join-requests`, {
        headers: this.getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch join requests');
      const data = await response.json();
      return data.map((r: any) => ({
        ...r,
        user: {
          ...r.user,
          avatarUrl: this.resolveImageUrl(r.user.avatarUrl),
        },
      }));
    } catch (err: any) {
      this.error.set(err?.message || 'Unknown error');
      return [];
    }
  }

  // Approve a join request
  async approveJoinRequest(requestId: number): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/clubs/join-requests/${requestId}/approve`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to approve request');
      return true;
    } catch (err: any) {
      this.error.set(err?.message || 'Unknown error');
      return false;
    }
  }

  // Reject a join request
  async rejectJoinRequest(requestId: number): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/clubs/join-requests/${requestId}/reject`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to reject request');
      return true;
    } catch (err: any) {
      this.error.set(err?.message || 'Unknown error');
      return false;
    }
  }

  // Get current user's managed clubs with status
  async getManagedClubs(): Promise<{ 
    id: number; 
    name: string; 
    shortDescription: string; 
    logoUrl: string; 
    status: string; 
    createdAt: Date; 
  }[]> {
    try {
      const response = await fetch(`${this.apiUrl}/clubs/managed/me`, {
        headers: this.getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch managed clubs');
      const data = await response.json();
      return data.map((c: any) => ({
        ...c,
        logoUrl: this.resolveImageUrl(c.logoUrl) || '',
        createdAt: new Date(c.createdAt),
      }));
    } catch (err: any) {
      this.error.set(err?.message || 'Unknown error');
      return [];
    }
  }
}
