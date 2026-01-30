import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { fadeSlideIn } from '../../animations';
import { EventsService } from '../../services/events.service';
import { ClubsService } from '../../services/clubs.service';
import { Event, RegistrationStatus } from '../../models/event.model';
import { TokenService } from '../../services/auth/token';
import { getTimeUntilEvent, formatCountdown, isEventLive, isEventEnded, getTimeUntilEventEnds, formatRemainingTime, TimeUntil } from '../../utils/time.utils';

@Component({
    selector: 'app-event-detail',
    imports: [CommonModule, RouterModule, FormsModule],
    templateUrl: './event-detail.html',
    styleUrl: './event-detail.css',
    animations: [fadeSlideIn]
})
export class EventDetailComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private eventsService = inject(EventsService);
    private clubsService = inject(ClubsService);
    private tokenService = inject(TokenService);

    event = signal<Event | null>(null);
    loading = signal(true);
    error = signal('');
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

    async ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            await this.loadEvent(+id);
        }
    }

    async loadEvent(id: number) {
        this.loading.set(true);
        this.error.set('');

        const event = await this.eventsService.getEventById(id);

        if (event) {
            this.event.set(event);
            // Check if following the club
            if (event.club && this.isLoggedIn()) {
                this.isFollowingClub.set(await this.clubsService.isFollowing(event.club.id));
            }
        } else {
            this.error.set(this.eventsService.error() || 'Event not found');
        }

        this.loading.set(false);
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
     * Update local event state without reloading from server
     * Improves UX by providing instant feedback
     */
    private updateEventState(newStatus: RegistrationStatus | null, previousStatus?: RegistrationStatus | null) {
        const evt = this.event();
        if (!evt) return;

        const updated = { ...evt };

        // Update user interaction status
        if (!updated.userInteraction) {
            updated.userInteraction = { status: newStatus, hasRated: false };
        } else {
            updated.userInteraction = { ...updated.userInteraction, status: newStatus };
        }

        // Update stats based on status changes
        if (updated.stats) {
            const stats = { ...updated.stats };

            // Decrement previous status count
            if (previousStatus === RegistrationStatus.INTERESTED) {
                stats.interestedCount = Math.max(0, stats.interestedCount - 1);
            } else if (previousStatus === RegistrationStatus.CONFIRMED) {
                stats.confirmedCount = Math.max(0, stats.confirmedCount - 1);
            }

            // Increment new status count
            if (newStatus === RegistrationStatus.INTERESTED) {
                stats.interestedCount = stats.interestedCount + 1;
            } else if (newStatus === RegistrationStatus.CONFIRMED) {
                stats.confirmedCount = stats.confirmedCount + 1;
            }

            updated.stats = stats;
        }

        this.event.set(updated);
    }

    async toggleInterest() {
        const evt = this.event();
        if (!evt || !this.isLoggedIn()) return;

        this.registrationLoading.set(true);

        try {
            const currentStatus = this.userStatus();

            if (currentStatus === RegistrationStatus.INTERESTED) {
                // Remove interest
                const success = await this.eventsService.cancelRegistration(evt.id);
                if (success) {
                    this.updateEventState(null, RegistrationStatus.INTERESTED);
                }
            } else {
                // Add interest
                const success = await this.eventsService.registerForEvent(evt.id, RegistrationStatus.INTERESTED);
                if (success) {
                    this.updateEventState(RegistrationStatus.INTERESTED, currentStatus);
                }
            }
        } catch (error) {
            console.error('Failed to toggle interest:', error);
            this.error.set('Failed to update interest. Please try again.');
        } finally {
            this.registrationLoading.set(false);
        }
    }

    async confirmAttendance() {
        const evt = this.event();
        if (!evt || !this.isLoggedIn()) return;

        // Show confirmation dialog
        const userConfirmed = confirm(
            'Confirm your attendance for this event?\n\n'
            + 'Note: For paid events or events requiring approval, '
            + 'the club manager will contact you to finalize your registration.'
        );

        if (!userConfirmed) return;

        this.registrationLoading.set(true);

        try {
            const currentStatus = this.userStatus();
            const success = await this.eventsService.registerForEvent(evt.id, RegistrationStatus.PENDING_PAYMENT);

            if (success) {
                this.updateEventState(RegistrationStatus.PENDING_PAYMENT, currentStatus);
                alert('✓ Registration confirmed! Please contact the club manager for payment details.');
            }
        } catch (error) {
            console.error('Failed to confirm attendance:', error);
            this.error.set('Failed to confirm attendance. Please try again.');
        } finally {
            this.registrationLoading.set(false);
        }
    }

    async cancelRegistration() {
        const evt = this.event();
        if (!evt || !this.isLoggedIn()) return;

        const userConfirmed = confirm('Are you sure you want to cancel your registration?');
        if (!userConfirmed) return;

        this.registrationLoading.set(true);

        try {
            const previousStatus = this.userStatus();
            const success = await this.eventsService.cancelRegistration(evt.id);

            if (success) {
                this.updateEventState(RegistrationStatus.CANCELLED, previousStatus);
            }
        } catch (error) {
            console.error('Failed to cancel registration:', error);
            this.error.set('Failed to cancel registration. Please try again.');
        } finally {
            this.registrationLoading.set(false);
        }
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

    async submitRating() {
        const evt = this.event();
        if (!evt || this.selectedRating() === 0) return;

        this.ratingLoading.set(true);

        try {
            const result = await this.eventsService.rateEvent(evt.id, {
                rating: this.selectedRating(),
                comment: this.ratingComment() || undefined
            });

            if (result) {
                // Update local event with new rating
                const updated = { ...evt };
                if (updated.userInteraction) {
                    updated.userInteraction = {
                        ...updated.userInteraction,
                        hasRated: true,
                        userRating: this.selectedRating()
                    };
                }
                this.event.set(updated);
                this.closeRatingModal();
                // Reload to get updated average rating
                await this.loadEvent(evt.id);
            }
        } catch (error) {
            console.error('Failed to submit rating:', error);
        } finally {
            this.ratingLoading.set(false);
        }
    }

    goBack() {
        this.router.navigate(['/events']);
    }
}
