import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { fadeSlideIn } from '../../animations';
import { ManagerApiService, Event } from '../../services/manager-api.service';
import { ClubsService } from '../../services/clubs.service';
import { JoinRequest } from '../../models/club.model';

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

    private now = () => new Date();
    private compareByStartTime = (a: Event, b: Event) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime();

    publishedCount = computed(() => this.events().filter(e => e.status === 'PUBLISHED').length);
    draftCount = computed(() => this.events().filter(e => e.status === 'DRAFT').length);

    upcomingEvents = computed(() =>
        this.events()
            .filter(e => new Date(e.startTime) >= this.now())
            .sort(this.compareByStartTime)
    );

    pastEvents = computed(() =>
        this.events()
            .filter(e => new Date(e.startTime) < this.now())
            .sort((a, b) => -this.compareByStartTime(a, b))
    );

    constructor(
        private managerApi: ManagerApiService,
        private clubsService: ClubsService,
        private router: Router
    ) { }

    ngOnInit() {
        this.loadData();
    }

    loadData() {
        this.loading.set(true);
        this.error.set('');

        this.managerApi.getClub().subscribe({
            next: (club) => {
                this.clubName.set(club.name);
                this.clubId.set(club.id);
                this.loadJoinRequests(club.id);
            },
            error: (err) => console.error('Failed to load club:', err)
        });

        this.managerApi.getAllEvents().subscribe({
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
        this.router.navigate(['/manager/events', eventId, 'edit']);
    }
}
