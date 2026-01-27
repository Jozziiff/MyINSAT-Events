import { Injectable, signal } from '@angular/core';
import { Club, ClubSection, ClubSummary, CreateClubDto } from '../models/club.model';

@Injectable({
  providedIn: 'root'
})
export class ClubsService {
  private readonly apiUrl = 'http://localhost:3000';

  clubs = signal<ClubSummary[]>([]);
  selectedClub = signal<Club | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

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

  async getClubById(id: number): Promise<Club | null> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const response = await fetch(`${this.apiUrl}/clubs/${id}`);
      if (!response.ok) throw new Error('Failed to fetch club details');
      const data: Club = await response.json();
      const resolved = this.resolveClubImages(data);
      this.selectedClub.set(resolved);
      return resolved;
    } catch (err: any) {
      this.error.set(err?.message || 'Unknown error');
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  async createClub(clubData: CreateClubDto, userId: number): Promise<Club | null> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const response = await fetch(`${this.apiUrl}/clubs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId.toString(),
          'x-user-role': 'owner',
        },
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

  async updateClub(id: number, clubData: CreateClubDto, userId: number): Promise<Club | null> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const response = await fetch(`${this.apiUrl}/clubs/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId.toString(),
          'x-user-role': 'owner',
        },
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
}
