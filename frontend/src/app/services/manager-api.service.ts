import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Club {
    id: number;
    name: string;
    description: string;
    paymentInfo: string;
    createdAt: string;
    updatedAt: string;
}

export interface Event {
    id: number;
    clubId: number;
    title: string;
    description?: string;
    location: string;
    startTime: string;
    endTime: string;
    capacity: number;
    price?: number;
    status: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
    createdAt: string;
    updatedAt: string;
}

export interface Registration {
    id: number;
    user: {
        id: number;
        email: string;
        fullName: string;
    };
    status: 'INTERESTED' | 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED' | 'REJECTED' | 'ATTENDED' | 'NO_SHOW';
    createdAt: string;
}

export interface EventRegistrations {
    event: {
        id: number;
        title: string;
        capacity: number;
        confirmedCount: number;
        startTime: string;
    };
    registrations: Registration[];
}

@Injectable({
    providedIn: 'root'
})
export class ManagerApiService {
    private apiUrl = 'http://localhost:3000/manager';

    constructor(private http: HttpClient) { }

    getClub(): Observable<Club> {
        return this.http.get<Club>(`${this.apiUrl}/club`);
    }

    updateClub(data: Partial<Club>): Observable<Club> {
        return this.http.put<Club>(`${this.apiUrl}/club`, data);
    }

    getAllEvents(): Observable<Event[]> {
        return this.http.get<Event[]>(`${this.apiUrl}/events`);
    }

    createEvent(event: Partial<Event>): Observable<Event> {
        return this.http.post<Event>(`${this.apiUrl}/events`, event);
    }

    updateEvent(id: number, event: Partial<Event>): Observable<Event> {
        return this.http.put<Event>(`${this.apiUrl}/events/${id}`, event);
    }

    deleteEvent(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/events/${id}`);
    }

    publishEvent(id: number): Observable<Event> {
        return this.http.patch<Event>(`${this.apiUrl}/events/${id}/publish`, {});
    }

    getEventRegistrations(eventId: number): Observable<EventRegistrations> {
        return this.http.get<EventRegistrations>(`${this.apiUrl}/events/${eventId}/registrations`);
    }

    updateRegistrationStatus(registrationId: number, status: string): Observable<Registration> {
        return this.http.patch<Registration>(`${this.apiUrl}/registrations/${registrationId}/status`, { status });
    }
}
