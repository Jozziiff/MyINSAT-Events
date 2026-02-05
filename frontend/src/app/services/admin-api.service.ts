import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { getApiUrl } from '../utils/image.utils';

export interface ClubForApproval {
    id: number;
    name: string;
    shortDescription: string;
    logoUrl: string;
    createdAt: Date;
    ownerId: number;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    owner?: {
        id: number;
        fullName: string;
        email: string;
    } | null;
}

@Injectable({
    providedIn: 'root'
})
export class AdminApiService {
    private readonly apiUrl = getApiUrl();
    private readonly http = inject(HttpClient);

    async getPendingClubs(): Promise<ClubForApproval[]> {
        try {
            return await firstValueFrom(this.http.get<ClubForApproval[]>(`${this.apiUrl}/admin/clubs/pending`));
        } catch (error) {
            console.error('Error fetching pending clubs:', error);
            return [];
        }
    }

    async getAllClubs(status?: 'PENDING' | 'APPROVED' | 'REJECTED'): Promise<ClubForApproval[]> {
        try {
            const url = status
                ? `${this.apiUrl}/admin/clubs?status=${status}`
                : `${this.apiUrl}/admin/clubs`;
            return await firstValueFrom(this.http.get<ClubForApproval[]>(url));
        } catch (error) {
            console.error('Error fetching clubs:', error);
            return [];
        }
    }

    async approveClub(clubId: number): Promise<boolean> {
        try {
            await firstValueFrom(this.http.patch(`${this.apiUrl}/admin/clubs/${clubId}/approve`, {}));
            return true;
        } catch (error) {
            console.error('Error approving club:', error);
            return false;
        }
    }

    async rejectClub(clubId: number): Promise<boolean> {
        try {
            await firstValueFrom(this.http.patch(`${this.apiUrl}/admin/clubs/${clubId}/reject`, {}));
            return true;
        } catch (error) {
            console.error('Error rejecting club:', error);
            return false;
        }
    }
}
