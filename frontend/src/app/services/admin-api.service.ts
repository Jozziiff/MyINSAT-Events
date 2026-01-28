import { Injectable, inject } from '@angular/core';
import { TokenService } from './auth/token';

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
    private readonly apiUrl = 'http://localhost:3000';
    private readonly tokenService = inject(TokenService);

    private getAuthHeaders(): HeadersInit {
        const token = this.tokenService.getAccessToken();
        return {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
    }

    async getPendingClubs(): Promise<ClubForApproval[]> {
        try {
            const response = await fetch(`${this.apiUrl}/admin/clubs/pending`, {
                headers: this.getAuthHeaders(),
            });
            if (!response.ok) throw new Error('Failed to fetch pending clubs');
            return response.json();
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
            const response = await fetch(url, {
                headers: this.getAuthHeaders(),
            });
            if (!response.ok) throw new Error('Failed to fetch clubs');
            return response.json();
        } catch (error) {
            console.error('Error fetching clubs:', error);
            return [];
        }
    }

    async approveClub(clubId: number): Promise<boolean> {
        try {
            const response = await fetch(`${this.apiUrl}/admin/clubs/${clubId}/approve`, {
                method: 'PATCH',
                headers: this.getAuthHeaders(),
            });
            return response.ok;
        } catch (error) {
            console.error('Error approving club:', error);
            return false;
        }
    }

    async rejectClub(clubId: number): Promise<boolean> {
        try {
            const response = await fetch(`${this.apiUrl}/admin/clubs/${clubId}/reject`, {
                method: 'PATCH',
                headers: this.getAuthHeaders(),
            });
            return response.ok;
        } catch (error) {
            console.error('Error rejecting club:', error);
            return false;
        }
    }
}
