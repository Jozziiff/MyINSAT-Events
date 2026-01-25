import { Component } from '@angular/core';
import { ProfileHeader } from '../components/profile-header/profile-header';
import { EventSection } from '../components/event-section/event-section';
import { ClubList } from '../components/club-list/club-list';
import {
  UserProfile,
  ProfileEvent,
  FollowedClub,
} from '../../../models/profile.models';
import { trigger, transition, style, animate, stagger, query } from '@angular/animations';

@Component({
  selector: 'app-profile-page',
  imports: [ProfileHeader, EventSection, ClubList],
  templateUrl: './profile-page.html',
  styleUrls: ['./profile-page.css'],
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate('600ms cubic-bezier(0.35, 0, 0.25, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('staggerCards', [
      transition(':enter', [
        query('.animate-card', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          stagger(100, [
            animate('500ms cubic-bezier(0.35, 0, 0.25, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ])
  ]
})
export class ProfilePage {
  profile: UserProfile = {
    id: 1,
    fullName: 'Youssef Hamdani',
    bio: 'Computer engineering student passionate about AI and systems.',
    studentYear: '3rd year',
    avatarUrl: 'assets/avatar.png',
  };

  upcomingEvents: ProfileEvent[] = [
    {
      id: 1,
      title: 'AI Workshop',
      date: '2026-03-12',
      status: 'upcoming',
    },
  ];

  pastEvents: ProfileEvent[] = [
    {
      id: 2,
      title: 'Cybersecurity Talk',
      date: '2026-02-10',
      status: 'past',
    },
  ];

  followedClubs: FollowedClub[] = [
    {
      id: 1,
      name: 'INSAT AI Club',
      logoUrl: 'assets/ai-club.png',
    },
  ];
}
