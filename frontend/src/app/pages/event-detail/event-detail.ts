import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { fadeSlideIn } from '../../animations';
import { EventsService } from '../../services/events.service';
import { ClubsService } from '../../services/clubs.service';
import { AuthStateService } from '../../services/auth/auth-state';
import { TokenService } from '../../services/auth/token';
import { Event, RegistrationStatus, EventRating } from '../../models/event.model';
import { getTimeUntilEvent, formatCountdown, isEventLive, isEventEnded, getTimeUntilEventEnds, formatRemainingTime, TimeUntil } from '../../utils/time.utils';

/**
 * EventDetailComponent - Single event view with interaction capabilities
 *
 * Architecture:
 * - Uses EventsService.selectedEvent as single source of truth
 * - Subscribes to Observables for side effects
 * - Manages only UI-specific state (modals, processing)
 *
 * Responsibilities:
 * - Event detail display
 * - Registration/interest management
 * - Rating submission
 * - Club follow/unfollow
 * - Time/date formatting
 */

@Component({
    selector: 'app-event-detail',
    imports: [CommonModule, RouterModule, FormsModule],
    templateUrl: './event-detail.html',
    styleUrl: './event-detail.css',
    animations: [fadeSlideIn]
})
export class EventDetailComponent implements OnInit, OnDestroy {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private eventsService = inject(EventsService);
    private clubsService = inject(ClubsService);
    private authState = inject(AuthStateService);
    private tokenService = inject(TokenService);
    private destroy$ = new Subject<void>();

    // Data state - read from service (single source of truth)
    event = this.eventsService.selectedEvent;
    loading = this.eventsService.loading;
    error = this.eventsService.error;
    sections = computed(() => this.event()?.sections ?? []);

    // Follow state
    isFollowingClub = signal(false);
    followLoading = signal(false);

    // Registration state
    registrationLoading = signal(false);

    // Rating state
    showRatingModal = signal(false);
    ratingLoading = signal(false);
    selectedRating = signal(0);
    hoverRating = signal(0);
    ratingComment = signal('');

    // Event ratings list
    eventRatings = signal<EventRating[]>([]);
    ratingsLoading = signal(false);
    showAllRatings = signal(false);

    // Computed properties
    isLoggedIn = computed(() => !!this.tokenService.getAccessToken());

    userStatus = computed(() => this.event()?.userInteraction?.status ?? null);

    hasAttended = computed(() => this.userStatus() === RegistrationStatus.ATTENDED);

    currentUserRating = computed(() => this.event()?.userInteraction?.userRating ?? 0);

    isUpcoming = computed(() => {
        const evt = this.event();
        if (!evt) return false;
        return new Date(evt.startTime) > new Date();
    });

    isPast = computed(() => {
        const evt = this.event();
        if (!evt) return false;
        return new Date(evt.endTime) < new Date();
    });

    isLive = computed(() => {
        const evt = this.event();
        if (!evt) return false;
        const now = new Date();
        return new Date(evt.startTime) <= now && new Date(evt.endTime) >= now;
    });

    displayedRatings = computed(() => {
        const ratings = this.eventRatings();
        return this.showAllRatings() ? ratings : ratings.slice(0, 3);
    });

    ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.loadEvent(+id);
        }
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Load event details - service handles loading/error state automatically
     */
    private loadEvent(id: number) {
        this.eventsService.getEventById(id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (event) => {
                    if (event) {
                        // Check if following the club
                        if (event.club && this.isLoggedIn()) {
                            this.clubsService.isFollowing(event.club.id).then(following => {
                                this.isFollowingClub.set(following);
                            });
                        }
                        // Load ratings if event has ended
                        if (new Date(event.endTime) < new Date()) {
                            this.loadEventRatings(id);
                        }
                    }
                    // Service handles loading/error states via signals
                },
                error: (err) => {
                    console.error('Failed to load event:', err);
                    // Service handles error state via signal
                }
            });
    }

    loadEventRatings(eventId: number) {
        this.ratingsLoading.set(true);
        this.eventsService.getEventRatings(eventId).pipe(
            takeUntil(this.destroy$)
        ).subscribe({
            next: (ratings) => {
                this.eventRatings.set(ratings);
                this.ratingsLoading.set(false);
            },
            error: (err) => {
                console.error('Failed to load ratings:', err);
                this.ratingsLoading.set(false);
            }
        });
    }

    toggleShowAllRatings() {
        this.showAllRatings.set(!this.showAllRatings());
    }

    async toggleFollowClub() {
        const club = this.event()?.club;
        if (!club || !this.isLoggedIn()) return;

        this.followLoading.set(true);

        if (this.isFollowingClub()) {
            const success = await this.clubsService.unfollowClub(club.id);
            if (success) this.isFollowingClub.set(false);
        } else {
            const success = await this.clubsService.followClub(club.id);
            if (success) this.isFollowingClub.set(true);
        }

        this.followLoading.set(false);
    }

    /**
     * Toggle user interest in event
     * Service handles state updates automatically via updateEventInteraction
     */
    toggleInterest() {
        const evt = this.event();
        if (!evt || !this.isLoggedIn()) return;

        this.registrationLoading.set(true);
        const currentStatus = this.userStatus();

        const operation$ = currentStatus === RegistrationStatus.INTERESTED
            ? this.eventsService.cancelRegistration(evt.id)
            : this.eventsService.registerForEvent(evt.id, RegistrationStatus.INTERESTED);

        operation$
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (success) => {
                    if (!success) {
                        console.error('Failed to toggle interest');
                    }
                    // Service automatically updates selectedEvent signal
                },
                error: (err) => {
                    console.error('Failed to toggle interest:', err);
                },
                complete: () => {
                    this.registrationLoading.set(false);
                }
            });
    }

    /**
     * Confirm attendance for event
     */
    confirmAttendance() {
        const evt = this.event();
        if (!evt || !this.isLoggedIn()) return;

        const userConfirmed = confirm(
            'Confirm your attendance for this event?\n\n'
            + 'Note: For paid events or events requiring approval, '
            + 'the club manager will contact you to finalize your registration.'
        );

        if (!userConfirmed) return;

        this.registrationLoading.set(true);

        this.eventsService.registerForEvent(evt.id, RegistrationStatus.PENDING_PAYMENT)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (success) => {
                    if (success) {
                        alert('✓ Registration confirmed! Please contact the club manager for payment details.');
                    } else {
                        console.error('Failed to confirm attendance');
                    }
                },
                error: (err) => {
                    console.error('Failed to confirm attendance:', err);
                },
                complete: () => {
                    this.registrationLoading.set(false);
                }
            });
    }

    /**
     * Cancel event registration
     */
    cancelRegistration() {
        const evt = this.event();
        if (!evt || !this.isLoggedIn()) return;

        const userConfirmed = confirm('Are you sure you want to cancel your registration?');
        if (!userConfirmed) return;

        this.registrationLoading.set(true);

        this.eventsService.cancelRegistration(evt.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (success) => {
                    if (!success) {
                        console.error('Failed to cancel registration');
                    }
                    // Service automatically updates selectedEvent signal
                },
                error: (err) => {
                    console.error('Failed to cancel registration:', err);
                },
                complete: () => {
                    this.registrationLoading.set(false);
                }
            });
    }

    formatDate(date: Date): string {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    formatTime(date: Date): string {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatPrice(price?: number): string {
        return this.eventsService.formatPrice(price);
    }

    getStatusLabel(status: RegistrationStatus): string {
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

    // Time utilities
    getTimeUntil(): TimeUntil | null {
        const evt = this.event();
        if (!evt) return null;
        return getTimeUntilEvent(evt.startTime);
    }

    formatCountdown(timeUntil: TimeUntil | null): string {
        return formatCountdown(timeUntil);
    }

    getTimeUntilEventEnds(): TimeUntil | null {
        const evt = this.event();
        if (!evt) return null;
        return getTimeUntilEventEnds(evt.endTime);
    }

    formatRemainingTime(timeUntil: TimeUntil | null): string {
        return formatRemainingTime(timeUntil);
    }

    openRatingModal() {
        const current = this.currentUserRating();
        this.selectedRating.set(current);
        this.showRatingModal.set(true);
    }

    closeRatingModal() {
        this.showRatingModal.set(false);
        this.selectedRating.set(0);
        this.hoverRating.set(0);
        this.ratingComment.set('');
    }

    setRating(rating: number) {
        this.selectedRating.set(rating);
    }

    setHoverRating(rating: number) {
        this.hoverRating.set(rating);
    }

    /**
     * Submit event rating
     * Service handles data updates, component handles UI flow
     */
    submitRating() {
        const evt = this.event();
        if (!evt || this.selectedRating() === 0) return;

        this.ratingLoading.set(true);

        this.eventsService.rateEvent(evt.id, {
            rating: this.selectedRating(),
            comment: this.ratingComment() || undefined
        })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
            next: (result) => {
                if (result) {
                    this.closeRatingModal();
                    // Reload event to get updated rating data
                    this.loadEvent(evt.id);
                }
            },
            error: (err) => {
                console.error('Failed to submit rating:', err);
            },
            complete: () => {
                this.ratingLoading.set(false);
            }
        });
    }

    goBack() {
        this.router.navigate(['/events']);
    }
}
