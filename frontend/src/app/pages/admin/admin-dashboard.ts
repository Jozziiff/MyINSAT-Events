import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminApiService, ClubForApproval } from '../../services/admin-api.service';

@Component({
    selector: 'app-admin-dashboard',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './admin-dashboard.html',
    styleUrls: ['./admin-dashboard.css'],
})
export class AdminDashboardComponent implements OnInit {
    private adminApi = inject(AdminApiService);

    // State
    clubs = signal<ClubForApproval[]>([]);
    loading = signal(true);
    error = signal<string | null>(null);
    activeTab = signal<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');

    // Computed
    pendingClubs = () => this.clubs().filter(c => c.status === 'PENDING');
    approvedClubs = () => this.clubs().filter(c => c.status === 'APPROVED');
    rejectedClubs = () => this.clubs().filter(c => c.status === 'REJECTED');

    async ngOnInit() {
        await this.loadClubs();
    }

    async loadClubs() {
        this.loading.set(true);
        this.error.set(null);
        try {
            const clubs = await this.adminApi.getAllClubs();
            this.clubs.set(clubs);
        } catch (err: any) {
            this.error.set(err?.message || 'Failed to load clubs');
        } finally {
            this.loading.set(false);
        }
    }

    setActiveTab(tab: 'PENDING' | 'APPROVED' | 'REJECTED') {
        this.activeTab.set(tab);
    }

    async approveClub(clubId: number) {
        const success = await this.adminApi.approveClub(clubId);
        if (success) {
            await this.loadClubs();
        }
    }

    async rejectClub(clubId: number) {
        const success = await this.adminApi.rejectClub(clubId);
        if (success) {
            await this.loadClubs();
        }
    }

    getClubsByTab() {
        switch (this.activeTab()) {
            case 'PENDING':
                return this.pendingClubs();
            case 'APPROVED':
                return this.approvedClubs();
            case 'REJECTED':
                return this.rejectedClubs();
        }
    }
}
