# INSATvents – Final Project Specification

## 1. Project Overview

**INSATvents** is a university event management platform designed for INSAT students and clubs. The platform allows students to discover events, register for them, and participate, while enabling club managers to manage events and validate registrations. Administrators supervise the entire system.

### Technology Stack

* **Frontend:** Angular
* **Backend:** NestJS
* **Database:** Relational (PostgreSQL / MySQL)
* **ORM:** TypeORM
* **Authentication:** Email + Password, JWT (Access + Refresh tokens)
* **External Integration:** Google Calendar (event synchronization only)

---

## 2. User Roles

### 2.1 Normal User (Student)

* Browse events without authentication
* Register and participate in events after authentication
* Follow clubs
* Receive notifications
* Sync events to Google Calendar

### 2.2 Club Manager

* Manages one or more clubs
* Creates and manages events
* Reviews registrations
* Validates payments and confirms participation

### 2.3 Admin

* Manages users, clubs, and events
* Assigns managers to clubs
* Moderates platform activity

---

## 3. Functional Features

### 3.1 Public Features (No Login Required)

* View upcoming events (default dashboard)
* View event details:

  * Event information
  * Payment details
  * Remaining places if capacity is limited

---

### 3.2 Authenticated User Features

#### Authentication & Account Management

* User registration with email and password
* Email verification
* JWT access token (short-lived)
* Refresh token (long-lived)
* Password reset

#### Event Registration

* Register interest in events
* Registration lifecycle managed through states:

  * INTERESTED
  * PENDING_PAYMENT
  * CONFIRMED
  * CANCELLED
  * REJECTED
  * ATTENDED
  * NO_SHOW
* A user’s place is locked only after payment is validated by a club manager

#### Dashboard & Profile

* View upcoming registered events
* View past events
* Countdown/time remaining for upcoming events

#### Ratings

* Rate events only if the user has attended the event

#### Clubs & Notifications

* Follow clubs
* Receive notifications for:

  * Registration status updates
  * Event reminders
  * New events from followed clubs

#### Google Calendar Integration

* Connect Google Calendar account
* Sync confirmed events to Google Calendar
* Disconnect Google Calendar at any time

---

### 3.3 Club Manager Features

* Authentication via JWT
* Manager dashboard
* Create, edit, and delete events
* View and manage event registrations
* Validate payments
* Confirm or reject registrations
* Manage club information
* View remaining event capacity

A single manager user can manage multiple clubs via explicit relationships.

---

### 3.4 Admin Features

* Manage users (activate, suspend, assign roles)
* Manage clubs
* Assign managers to clubs
* Moderate events
* View platform-level information

---

## 4. Core Business Rules

* Event browsing is public
* Event registration requires authentication
* Registration follows a strict state machine
* Event capacity decreases only when a registration is CONFIRMED
* Only users with ATTENDED status can rate an event
* One user account represents one real person

---

## 5. Notification System Design

* Notifications are stored persistently in the database
* They are created by business events (registration updates, reminders, new events)
* Notifications are read/unread
* They can be delivered via API polling or real-time (WebSocket)

---

## 6. Final Database Schema

### 6.1 users

Stores identity, authentication, and basic personal data.

```
users
-----
id (PK)
email (unique)
password_hash
full_name
avatar_url (nullable)
role (ADMIN | MANAGER | USER)
email_verified
is_active
created_at
updated_at
```

---

### 6.2 refresh_tokens

Manages JWT session lifecycle and multi-device login.

```
refresh_tokens
--------------
id (PK)
user_id (FK → users.id)
token_hash
expires_at
revoked_at (nullable)
created_at
```

---

### 6.3 email_verification_tokens

```
email_verification_tokens
-------------------------
id (PK)
user_id (FK → users.id)
token_hash
expires_at
used_at (nullable)
created_at
```

---

### 6.4 password_reset_tokens

```
password_reset_tokens
---------------------
id (PK)
user_id (FK → users.id)
token_hash
expires_at
used_at (nullable)
created_at
```

---

### 6.5 clubs

Represents INSAT clubs.

```
clubs
-----
id (PK)
name (unique)
description
payment_info
created_at
updated_at
```

---

### 6.6 club_managers

Links users to the clubs they manage.

```
club_managers
-------------
id (PK)
user_id (FK → users.id)
club_id (FK → clubs.id)
```

---

### 6.7 events

Stores event information.

```
events
------
id (PK)
club_id (FK → clubs.id)
title
description
location
start_time
end_time
capacity (nullable)
price
status (DRAFT | PUBLISHED | CLOSED)
created_at
updated_at
```

---

### 6.8 registrations

Core table representing event participation lifecycle.

```
registrations
-------------
id (PK)
user_id (FK → users.id)
event_id (FK → events.id)
status (
  INTERESTED |
  PENDING_PAYMENT |
  CONFIRMED |
  CANCELLED |
  REJECTED |
  ATTENDED |
  NO_SHOW
)
created_at
updated_at
```

---

### 6.9 event_ratings

```
event_ratings
-------------
id (PK)
user_id (FK → users.id)
event_id (FK → events.id)
rating (1–5)
comment (nullable)
created_at
```

---

### 6.10 club_followers

```
club_followers
--------------
id (PK)
user_id (FK → users.id)
club_id (FK → clubs.id)
created_at
```

---

### 6.11 notifications

Stores system-generated notifications.

```
notifications
-------------
id (PK)
user_id (FK → users.id)
type
title
message
metadata (JSON, nullable)
is_read
created_at
```

---

### 6.12 google_calendar_accounts

Stores Google Calendar integration tokens.

```
google_calendar_accounts
------------------------
id (PK)
user_id (FK → users.id)
access_token_encrypted
refresh_token_encrypted
expires_at
created_at
updated_at
```

---

## 7. Architectural Notes

* Access JWTs are stateless and not stored in the database
* Refresh tokens and one-time tokens are stored in dedicated tables
* Registration lifecycle is enforced via a state machine in the backend
* External integrations are isolated from core authentication
* Schema is designed for security, scalability, and maintainability

---

**End of Final Specification**
