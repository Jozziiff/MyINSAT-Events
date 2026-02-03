import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, EMPTY, of } from 'rxjs';
import { map, tap, catchError, finalize } from 'rxjs/operators';
import { Event, EventSummary, RateEventRequest, EventRating, RegistrationStatus } from '../models/event.model';
import { resolveImageUrl, getApiUrl } from '../utils/image.utils';
import { TokenService } from './auth/token';

/**
 * EventsService - Pure data service for event-related HTTP operations
 *
 * Responsibilities:
 * - HTTP communication with event endpoints
 * - Data transformation (dates, image URLs, safe defaults)
 * - State management via signals
 *
 * Does NOT handle:
 * - UI formatting (moved to components/pipes)
 * - Business logic beyond data fetching
 * - Direct DOM manipulation
 */

@Injectable({
  providedIn: 'root'
})
export class EventsService {
  private readonly apiUrl = getApiUrl();
  private readonly tokenService = inject(TokenService);
  private readonly http = inject(HttpClient);

  // Signals for state management - reactive UI state
  events = signal<EventSummary[]>([]);
  trendingEvents = signal<EventSummary[]>([]);
  selectedEvent = signal<Event | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  /**
   * HTTP headers factory - centralized header management
   * Handles authentication and content type consistently
   */
  private getHttpHeaders(): HttpHeaders {
    const token = this.tokenService.getAccessToken();
    const headers: { [key: string]: string } = {
      'Content-Type': 'application/json'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return new HttpHeaders(headers);
  }

  /**
   * Data transformation helpers - convert API DTOs to frontend models
   * Ensures consistent data structure and safe defaults
   */
  private mapEventSummary(dto: any): EventSummary {
    return {
      ...dto,
      photoUrl: resolveImageUrl(dto.photoUrl),
      startTime: new Date(dto.startTime),
      endTime: new Date(dto.endTime),
      club: dto.club ? {
        ...dto.club,
        logoUrl: resolveImageUrl(dto.club.logoUrl),
      } : null,
      stats: dto.stats || {
        interestedCount: 0,
        confirmedCount: 0,
        attendedCount: 0,
        averageRating: 0,
        ratingCount: 0,
      },
      userInteraction: dto.userInteraction || null,
    };
  }

  private mapFullEvent(dto: any): Event {
    return {
      ...dto,
      photoUrl: resolveImageUrl(dto.photoUrl),
      startTime: new Date(dto.startTime),
      endTime: new Date(dto.endTime),
      createdAt: new Date(dto.createdAt),
      updatedAt: new Date(dto.updatedAt),
      sections: dto.sections?.map((section: any) => ({
        ...section,
        imageUrl: resolveImageUrl(section.imageUrl),
      })) || [],
      club: dto.club ? {
        ...dto.club,
        logoUrl: resolveImageUrl(dto.club.logoUrl),
      } : null,
      stats: dto.stats || {
        interestedCount: 0,
        confirmedCount: 0,
        attendedCount: 0,
        averageRating: 0,
        ratingCount: 0,
      },
      userInteraction: dto.userInteraction || null,
    };
  }

  // Public API methods - HTTP operations that return Observables

  /**
   * Fetches all events and updates events signal
   */
  getAllEvents(): Observable<EventSummary[]> {
    this.loading.set(true);
    this.error.set(null);

    return this.http.get<any[]>(`${this.apiUrl}/events`, {
      headers: this.getHttpHeaders()
    }).pipe(
      map(data => data.map(dto => this.mapEventSummary(dto))),
      tap(events => this.events.set(events)),
      catchError(err => {
        this.error.set(err?.message || 'Failed to fetch events');
        return of([]);
      }),
      finalize(() => this.loading.set(false))
    );
  }

  /**
   * Fetches upcoming events and updates events signal
   */
  getUpcomingEvents(): Observable<EventSummary[]> {
    this.loading.set(true);
    this.error.set(null);

    return this.http.get<any[]>(`${this.apiUrl}/events/upcoming`, {
      headers: this.getHttpHeaders()
    }).pipe(
      map(data => data.map(dto => this.mapEventSummary(dto))),
      tap(events => this.events.set(events)),
      catchError(err => {
        this.error.set(err?.message || 'Failed to fetch upcoming events');
        return of([]);
      }),
      finalize(() => this.loading.set(false))
    );
  }

  /**
   * Fetches trending events and updates trendingEvents signal
   */
  getTrendingEvents(limit: number = 10): Observable<EventSummary[]> {
    this.loading.set(true);
    this.error.set(null);

    return this.http.get<any[]>(`${this.apiUrl}/events/trending`, {
      headers: this.getHttpHeaders(),
      params: { limit: limit.toString() }
    }).pipe(
      map(data => data.map(dto => this.mapEventSummary(dto))),
      tap(events => this.trendingEvents.set(events)),
      catchError(err => {
        this.error.set(err?.message || 'Failed to fetch trending events');
        return of([]);
      }),
      finalize(() => this.loading.set(false))
    );
  }

  /**
   * Fetches event details by ID and updates selectedEvent signal
   */
  getEventById(id: number): Observable<Event | null> {
    this.loading.set(true);
    this.error.set(null);

    return this.http.get<any>(`${this.apiUrl}/events/${id}`, {
      headers: this.getHttpHeaders()
    }).pipe(
      map(dto => this.mapFullEvent(dto)),
      tap(event => this.selectedEvent.set(event)),
      catchError(err => {
        this.error.set(err?.message || 'Failed to fetch event details');
        return of(null);
      }),
      finalize(() => this.loading.set(false))
    );
  }

  /**
   * Submits event rating
   */
  rateEvent(eventId: number, request: RateEventRequest): Observable<EventRating | null> {
    return this.http.post<EventRating>(`${this.apiUrl}/events/${eventId}/rate`, request, {
      headers: this.getHttpHeaders()
    }).pipe(
      catchError(err => {
        this.error.set(err?.message || 'Failed to rate event');
        return of(null);
      })
    );
  }

  /**
   * Fetches ratings for a specific event
   */
  getEventRatings(eventId: number): Observable<EventRating[]> {
    return this.http.get<EventRating[]>(`${this.apiUrl}/events/${eventId}/ratings`, {
      headers: this.getHttpHeaders()
    }).pipe(
      catchError(err => {
        this.error.set(err?.message || 'Failed to fetch ratings');
        return of([]);
      })
    );
  }

  /**
   * Registers for an event with specified status
   */
  registerForEvent(eventId: number, status: RegistrationStatus): Observable<boolean> {
    return this.http.post(`${this.apiUrl}/events/${eventId}/register`, { status }, {
      headers: this.getHttpHeaders()
    }).pipe(
      map(() => {
        this.updateEventInteraction(eventId, status);
        return true;
      }),
      catchError(err => {
        this.error.set(err?.message || 'Failed to register for event');
        return of(false);
      })
    );
  }

  /**
   * Cancels registration for an event
   */
  cancelRegistration(eventId: number): Observable<boolean> {
    return this.http.delete(`${this.apiUrl}/events/${eventId}/register`, {
      headers: this.getHttpHeaders()
    }).pipe(
      map(() => {
        this.updateEventInteraction(eventId, RegistrationStatus.CANCELLED);
        return true;
      }),
      catchError(err => {
        this.error.set(err?.message || 'Failed to cancel registration');
        return of(false);
      })
    );
  }

  /**
   * Updates event interaction state across all signals
   * Maintains consistency between events, trending, and selected event
   */
  private updateEventInteraction(eventId: number, status: RegistrationStatus | null) {
    // Update in events list
    const currentEvents = this.events();
    const updatedEvents = currentEvents.map(event => {
      if (event.id === eventId) {
        return {
          ...event,
          userInteraction: {
            ...event.userInteraction,
            status,
            hasRated: event.userInteraction?.hasRated || false,
          },
          stats: {
            ...event.stats,
            interestedCount: status === RegistrationStatus.INTERESTED
              ? event.stats.interestedCount + 1
              : Math.max(0, event.stats.interestedCount - 1),
          },
        };
      }
      return event;
    });
    this.events.set(updatedEvents);

    // Update in trending events
    const currentTrending = this.trendingEvents();
    const updatedTrending = currentTrending.map(event => {
      if (event.id === eventId) {
        return {
          ...event,
          userInteraction: {
            ...event.userInteraction,
            status,
            hasRated: event.userInteraction?.hasRated || false,
          },
          stats: {
            ...event.stats,
            interestedCount: status === RegistrationStatus.INTERESTED
              ? event.stats.interestedCount + 1
              : Math.max(0, event.stats.interestedCount - 1),
          },
        };
      }
      return event;
    });
    this.trendingEvents.set(updatedTrending);

    // Update selected event if it matches
    const selectedEvent = this.selectedEvent();
    if (selectedEvent && selectedEvent.id === eventId) {
      this.selectedEvent.set({
        ...selectedEvent,
        userInteraction: {
          ...selectedEvent.userInteraction,
          status,
          hasRated: selectedEvent.userInteraction?.hasRated || false,
        },
        stats: {
          ...selectedEvent.stats,
          interestedCount: status === RegistrationStatus.INTERESTED
            ? selectedEvent.stats.interestedCount + 1
            : Math.max(0, selectedEvent.stats.interestedCount - 1),
        },
      });
    }
  }

  // Formatting helper methods - for backward compatibility with components
  // TODO: Consider moving these to pipes or component methods in future refactoring

  /**
   * Format date for display (e.g., "Oct 20")
   */
  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  /**
   * Format price for display
   */
  formatPrice(price?: number): string {
    if (!price || price === 0) return 'Free';
    return `${price} TND`;
  }

  /**
   * Get status label for display
   */
  getStatusLabel(event: EventSummary): string {
    if (event.capacity) {
      return 'Open';
    }
    return 'Open';
  }

  /**
   * Format rating for display
   */
  formatRating(rating: number): string {
    return rating.toFixed(1);
  }
}
