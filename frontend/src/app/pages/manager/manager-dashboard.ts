import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { fadeSlideIn } from '../../animations';
import { ManagerApiService, Event, Club, ClubManager } from '../../services/manager-api.service';
import { ClubsService } from '../../services/clubs.service';
import { JoinRequest } from '../../models/club.model';
import { isEventLive, getTimeUntilEventEnds, formatRemainingTime, TimeUntil } from '../../utils/time.utils';

@Component({
    selector: 'app-manager-dashboard',
    imports: [CommonModule, RouterModule],
    templateUrl: './manager-dashboard.html',
    styleUrl: './manager-dashboard.css',
    animations: [fadeSlideIn]
})
export class ManagerDashboardComponent implements OnInit {
    events = signal<Event[]>([]);
    clubName = signal('Loading...');
    clubId = signal<number | null>(null);
    loading = signal(true);
    error = signal('');
    joinRequests = signal<JoinRequest[]>([]);

    // Multi-club support
    managedClubs = signal<Club[]>([]);
    selectedClubId = signal<number | null>(null);

    // Managers popup
    showManagersPopup = signal(false);
    clubManagers = signal<ClubManager[]>([]);
    loadingManagers = signal(false);

    private now = () => new Date();
    private compareByStartTime = (a: Event, b: Event) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime();

    publishedCount = computed(() => this.events().filter(e => e.status === 'PUBLISHED').length);
    draftCount = computed(() => this.events().filter(e => e.status === 'DRAFT').length);

    hasMultipleClubs = computed(() => this.managedClubs().length > 1);

    liveEvents = computed(() =>
        this.events()
            .filter(e => isEventLive(new Date(e.startTime), new Date(e.endTime)))
            .sort(this.compareByStartTime)
    );

    upcomingEvents = computed(() =>
        this.events()
            .filter(e => {
                const start = new Date(e.startTime);
                const end = new Date(e.endTime);
                return start >= this.now() && !isEventLive(start, end);
            })
            .sort(this.compareByStartTime)
    );

    pastEvents = computed(() =>
        this.events()
            .filter(e => {
                const end = new Date(e.endTime);
                return end < this.now();
            })
            .sort((a, b) => -this.compareByStartTime(a, b))
    );

    constructor(
        private managerApi: ManagerApiService,
        private clubsService: ClubsService,
        private router: Router
    ) { }

    ngOnInit() {
        this.loadManagedClubs();
    }

    loadManagedClubs() {
        this.managerApi.getAllManagedClubs().subscribe({
            next: (clubs) => {
                this.managedClubs.set(clubs);
                if (clubs.length > 0) {
                    // Select the first club by default
                    this.selectClub(clubs[0].id);
                } else {
                    this.loading.set(false);
                    this.error.set('You are not managing any club');
                }
            },
            error: (err) => {
                console.error('Failed to load managed clubs:', err);
                this.loading.set(false);
                this.error.set('Failed to load your clubs');
            }
        });
    }

    selectClub(clubId: number) {
        this.selectedClubId.set(clubId);
        const club = this.managedClubs().find(c => c.id === clubId);
        if (club) {
            this.clubName.set(club.name);
            this.clubId.set(club.id);
            this.loadClubData(clubId);
        }
    }

    loadClubData(clubId: number) {
        this.loading.set(true);
        this.error.set('');

        this.managerApi.getClubEvents(clubId).subscribe({
            next: (events) => {
                this.events.set(events);
                this.loading.set(false);
            },
            error: (err) => {
                this.error.set('Failed to load events');
                this.loading.set(false);
                console.error(err);
            }
        });

        this.loadJoinRequests(clubId);
    }

    loadData() {
        const clubId = this.selectedClubId();
        if (clubId) {
            this.loadClubData(clubId);
        }
    }

    async loadJoinRequests(clubId: number) {
        const requests = await this.clubsService.getClubJoinRequests(clubId);
        this.joinRequests.set(requests);
    }

    async approveRequest(request: JoinRequest) {
        if (!confirm(`Approve ${request.user.fullName}'s request to join the club?`)) return;
        
        const success = await this.clubsService.approveJoinRequest(request.id);
        if (success) {
            this.joinRequests.update(requests => requests.filter(r => r.id !== request.id));
        } else {
            alert('Failed to approve request');
        }
    }

    async rejectRequest(request: JoinRequest) {
        if (!confirm(`Reject ${request.user.fullName}'s request?`)) return;
        
        const success = await this.clubsService.rejectJoinRequest(request.id);
        if (success) {
            this.joinRequests.update(requests => requests.filter(r => r.id !== request.id));
        } else {
            alert('Failed to reject request');
        }
    }

    // Managers popup methods
    openManagersPopup() {
        const clubId = this.selectedClubId();
        if (!clubId) return;

        this.showManagersPopup.set(true);
        this.loadingManagers.set(true);

        this.managerApi.getClubManagers(clubId).subscribe({
            next: (managers) => {
                this.clubManagers.set(managers);
                this.loadingManagers.set(false);
            },
            error: (err) => {
                console.error('Failed to load managers:', err);
                this.loadingManagers.set(false);
            }
        });
    }

    closeManagersPopup() {
        this.showManagersPopup.set(false);
        this.clubManagers.set([]);
    }

    removeManager(manager: ClubManager) {
        const clubId = this.selectedClubId();
        if (!clubId) return;

        if (!confirm(`Remove ${manager.fullName} as a manager? They will no longer be able to manage this club.`)) return;

        this.managerApi.removeManager(clubId, manager.id).subscribe({
            next: () => {
                this.clubManagers.update(managers => managers.filter(m => m.id !== manager.id));
            },
            error: (err) => {
                if (err.status === 400) {
                    alert('You cannot remove yourself as a manager');
                } else {
                    alert('Failed to remove manager');
                }
            }
        });
    }

    getStatusClass(status: string): string {
        return status.toLowerCase();
    }

    formatDate(dateString: string): string {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    formatTime(dateString: string): string {
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    publishEvent(event: Event) {
        if (!confirm(`Publish "${event.title}"? Students will be able to register.`)) return;

        this.managerApi.publishEvent(event.id).subscribe({
            next: () => this.loadData(),
            error: (err) => alert('Failed to publish event: ' + err.message)
        });
    }

    deleteEvent(event: Event) {
        if (!confirm(`Delete "${event.title}"? This cannot be undone.`)) return;

        this.managerApi.deleteEvent(event.id).subscribe({
            next: () => this.loadData(),
            error: (err) => alert('Failed to delete event: ' + err.message)
        });
    }

    viewRegistrations(eventId: number) {
        this.router.navigate(['/manager/events', eventId, 'registrations']);
    }

    viewEvent(eventId: number) {
        this.router.navigate(['/events', eventId]);
    }

    editEvent(eventId: number) {
        this.router.navigate(['/manager/clubs', this.selectedClubId(), 'events', eventId, 'edit']);
    }

    // Live events helpers
    isLive(event: Event): boolean {
        return isEventLive(new Date(event.startTime), new Date(event.endTime));
    }

    getRemainingTime(event: Event): TimeUntil | null {
        return getTimeUntilEventEnds(new Date(event.endTime));
    }

    formatRemaining(timeUntil: TimeUntil | null): string {
        return formatRemainingTime(timeUntil);
    }
}
