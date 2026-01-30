import { Component, signal, inject, OnInit } from '@angular/core';
import { fadeSlideIn } from '../../animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { EventsService } from '../../services/events.service';
import { AuthStateService } from '../../services/auth/auth-state';
import { UserService } from '../../services/user.service';
import { EventSummary, RegistrationStatus } from '../../models/event.model';
import { getTimeUntilEvent, formatCountdown, isEventLive, isEventEnded, getTimeUntilEventEnds, formatRemainingTime } from '../../utils/time.utils';

type FilterType = 'all' | 'my-clubs' | 'live' | 'upcoming' | 'ended';
type SortType = 'date-asc' | 'date-desc' | 'interested' | 'confirmed' | 'rating';

@Component({
  selector: 'app-events',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './events.html',
  styleUrl: './events.css',
  animations: [fadeSlideIn]
})
export class EventsComponent implements OnInit {
  private eventsService = inject(EventsService);
  private authState = inject(AuthStateService);
  private userService = inject(UserService);
  private router = inject(Router);

  searchQuery = signal('');
  selectedFilter = signal<FilterType>('upcoming');
  selectedSort = signal<SortType>('date-asc');
  showSortDropdown = signal(false);
  showFilterDropdown = signal(false);

  // Events from the service
  events = signal<EventSummary[]>([]);
  followedClubIds = signal<number[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  // Track which events are being processed
  processingEvents = signal<Set<number>>(new Set());
  isAuthenticated = this.authState.isAuthenticated;

  // Filter options
  get filterOptions() {
    const options = [
      { value: 'all' as FilterType, label: 'All Events', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>' },
      { value: 'live' as FilterType, label: 'Live Now', icon: '<span class="live-dot"></span>' },
      { value: 'upcoming' as FilterType, label: 'Upcoming', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>' },
      { value: 'ended' as FilterType, label: 'Ended', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>' }
    ];

    if (this.isAuthenticated()) {
      options.splice(1, 0, { value: 'my-clubs' as FilterType, label: 'My Clubs', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>' });
    }

    return options;
  }

  // Sort options
  sortOptions = [
    { value: 'date-asc' as SortType, label: 'Earliest First', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><path d="M8 14l4 4 4-4"></path></svg>' },
    { value: 'date-desc' as SortType, label: 'Latest First', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><path d="M8 18l4-4 4 4"></path></svg>' },
    { value: 'interested' as SortType, label: 'Most Interested', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>' },
    { value: 'confirmed' as SortType, label: 'Most Confirmed', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>' },
    { value: 'rating' as SortType, label: 'Highest Rated', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>' }
  ];

  async ngOnInit() {
    await this.loadEvents();
    if (this.isAuthenticated()) {
      await this.loadFollowedClubs();
    }
  }

  async loadEvents() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const data = await this.eventsService.getAllEvents();
      this.events.set(data);
    } catch (err: any) {
      this.error.set(err?.message || 'Failed to load events');
    } finally {
      this.loading.set(false);
    }
  }

  async loadFollowedClubs() {
    try {
      const clubs = await this.userService.getFollowedClubs();
      this.followedClubIds.set(clubs.map(c => c.id));
    } catch (err) {
      console.error('Failed to load followed clubs:', err);
    }
  }

  // Apply filter
  applyFilter(filter: FilterType) {
    this.selectedFilter.set(filter);
    this.showFilterDropdown.set(false);
  }

  // Apply sort
  applySort(sort: SortType) {
    this.selectedSort.set(sort);
    this.showSortDropdown.set(false);
  }

  // Get current filter label
  get currentFilterLabel(): string {
    return this.filterOptions.find(opt => opt.value === this.selectedFilter())?.label || 'Filter';
  }

  // Get current sort label
  get currentSortLabel(): string {
    return this.sortOptions.find(opt => opt.value === this.selectedSort())?.label || 'Sort';
  }

  // Get filtered and sorted events
  get filteredEvents(): EventSummary[] {
    let filtered = this.events();
    const query = this.searchQuery().toLowerCase();

    // Apply search
    if (query) {
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(query) ||
        event.club?.name?.toLowerCase().includes(query) ||
        event.description?.toLowerCase().includes(query)
      );
    }

    // Apply filter
    const filter = this.selectedFilter();
    if (filter === 'my-clubs') {
      const clubIds = this.followedClubIds();
      filtered = filtered.filter(event => event.club && clubIds.includes(event.club.id));
    } else if (filter === 'live') {
      filtered = filtered.filter(event => this.isEventLive(event));
    } else if (filter === 'upcoming') {
      filtered = filtered.filter(event => !this.isEventLive(event) && !this.isEventEnded(event));
    } else if (filter === 'ended') {
      filtered = filtered.filter(event => this.isEventEnded(event));
    }

    // Apply sort - create a copy to avoid mutating the filtered array
    const sorted = [...filtered];
    const sort = this.selectedSort();
    if (sort === 'date-asc') {
      sorted.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    } else if (sort === 'date-desc') {
      sorted.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    } else if (sort === 'interested') {
      sorted.sort((a, b) => (b.stats?.interestedCount || 0) - (a.stats?.interestedCount || 0));
    } else if (sort === 'confirmed') {
      sorted.sort((a, b) => (b.stats?.confirmedCount || 0) - (a.stats?.confirmedCount || 0));
    } else if (sort === 'rating') {
      sorted.sort((a, b) => {
        const aRatingCount = a.stats?.ratingCount || 0;
        const bRatingCount = b.stats?.ratingCount || 0;
        const aAvgRating = a.stats?.averageRating || 0;
        const bAvgRating = b.stats?.averageRating || 0;
        // Only compare if both have ratings
        if (aRatingCount === 0 && bRatingCount === 0) return 0;
        if (aRatingCount === 0) return 1;
        if (bRatingCount === 0) return -1;
        return bAvgRating - aAvgRating;
      });
    }

    return sorted;
  }

  // Format date for display
  formatDate(date: Date): string {
    return this.eventsService.formatDate(date);
  }

  // Format price for display
  formatPrice(price?: number): string {
    return this.eventsService.formatPrice(price);
  }

  // Format rating
  formatRating(rating: number): string {
    if (rating === 0) return 'New';
    return rating.toFixed(1);
  }

  // Navigate to event details
  navigateToEvent(eventId: number) {
    this.router.navigate(['/events', eventId]);
  }

  // Check if user is interested in event
  isInterested(event: EventSummary): boolean {
    return event.userInteraction?.status === RegistrationStatus.INTERESTED;
  }

  // Check if user was rejected from event
  isRejected(event: EventSummary): boolean {
    return event.userInteraction?.status === RegistrationStatus.REJECTED;
  }

  // Check if user is confirmed for event
  isConfirmed(event: EventSummary): boolean {
    return event.userInteraction?.status === RegistrationStatus.CONFIRMED;
  }

  // Check if user has pending payment
  isPendingPayment(event: EventSummary): boolean {
    return event.userInteraction?.status === RegistrationStatus.PENDING_PAYMENT;
  }

  // Check if user has attended
  isAttended(event: EventSummary): boolean {
    return event.userInteraction?.status === RegistrationStatus.ATTENDED;
  }

  // Get registration status for display
  getRegistrationStatus(event: EventSummary): RegistrationStatus | null {
    return event.userInteraction?.status || null;
  }

  // Get registration status label
  getRegistrationStatusLabel(status: RegistrationStatus): string {
    const labels: Record<RegistrationStatus, string> = {
      [RegistrationStatus.INTERESTED]: 'Interested',
      [RegistrationStatus.PENDING_PAYMENT]: 'Pending Payment',
      [RegistrationStatus.CONFIRMED]: 'Confirmed',
      [RegistrationStatus.CANCELLED]: 'Cancelled',
      [RegistrationStatus.REJECTED]: 'Rejected',
      [RegistrationStatus.ATTENDED]: 'Attended',
      [RegistrationStatus.NO_SHOW]: 'No Show',
    };
    return labels[status] || status;
  }

  // Check if event is being processed
  isProcessing(eventId: number): boolean {
    return this.processingEvents().has(eventId);
  }

  // Check if event has ended (using utility)
  isEventEnded(event: EventSummary): boolean {
    return isEventEnded(event.endTime);
  }

  // Check if event is currently live (using utility)
  isEventLive(event: EventSummary): boolean {
    return isEventLive(event.startTime, event.endTime);
  }

  // Get time until event starts (using utility)
  getTimeUntilEvent(event: EventSummary): { value: number; unit: 'minutes' | 'hours' | 'days' } | null {
    return getTimeUntilEvent(event.startTime);
  }

  // Format countdown display (using utility)
  formatCountdown(timeUntil: { value: number; unit: 'minutes' | 'hours' | 'days' } | null): string {
    return formatCountdown(timeUntil);
  }

  // Get remaining time until live event ends
  getTimeUntilEventEnds(event: EventSummary) {
    return getTimeUntilEventEnds(event.endTime);
  }

  // Format remaining time for live events
  formatRemainingTime(timeUntil: { value: number; unit: 'minutes' | 'hours' | 'days' } | null): string {
    return formatRemainingTime(timeUntil);
  }

  // Toggle interest in event
  async toggleInterest(event: EventSummary, e: MouseEvent) {
    e.stopPropagation();

    if (!this.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    if (this.isProcessing(event.id)) return;

    // Add to processing
    const processing = new Set(this.processingEvents());
    processing.add(event.id);
    this.processingEvents.set(processing);

    try {
      const wasInterested = this.isInterested(event);

      if (wasInterested) {
        // User is already interested, so cancel/remove the registration
        await this.eventsService.cancelRegistration(event.id);
      } else {
        // User is not interested, so register with INTERESTED status
        await this.eventsService.registerForEvent(event.id, RegistrationStatus.INTERESTED);
      }

      // Update local state without reloading
      const currentEvents = this.events();
      const updatedEvents = currentEvents.map(e => {
        if (e.id === event.id) {
          const updatedEvent = { ...e };

          // Update user interaction
          if (wasInterested) {
            updatedEvent.userInteraction = undefined;
            // Decrement interested count
            updatedEvent.stats = {
              ...updatedEvent.stats,
              interestedCount: Math.max(0, updatedEvent.stats.interestedCount - 1)
            };
          } else {
            updatedEvent.userInteraction = {
              status: RegistrationStatus.INTERESTED,
              hasRated: false
            };
            // Increment interested count
            updatedEvent.stats = {
              ...updatedEvent.stats,
              interestedCount: updatedEvent.stats.interestedCount + 1
            };
          }

          return updatedEvent;
        }
        return e;
      });

      this.events.set(updatedEvents);
    } finally {
      // Remove from processing
      const updated = new Set(this.processingEvents());
      updated.delete(event.id);
      this.processingEvents.set(updated);
    }
  }
}
