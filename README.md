# Rwanda Ride Connect

KATISHA BUS — Rwanda Bus Ticket Booking and Sales System

Build a complete professional transportation platform called KATISHA BUS, designed for bus ticket booking and sales in Rwanda.

The system must support three bus agencies:

Horizon Express

Volcano Express

Stella Express

The system must have:

A Flutter mobile application for passengers

Node.js + Express.js backend

MySQL primary database

SQLite local/offline database where appropriate

Separate Admin Dashboard for each bus agency

One Super Admin Dashboard controlling the entire system

REST API connecting Flutter, dashboards, and backend

JWT authentication

Role-based access control

The system should be designed as a real-world student project that can later be extended into a production system.

1. TECHNOLOGY STACK

Frontend — Mobile

Use:

Flutter

Dart

Material 3

Android

iOS

Responsive UI

Clean architecture

REST API integration

Use a maintainable Flutter structure such as:

lib/
├── main.dart
├── core/
│   ├── constants/
│   ├── theme/
│   ├── utils/
│   └── network/
├── models/
├── services/
├── providers/
├── screens/
├── widgets/
├── routes/
└── storage/


Use a state-management solution such as Provider or Riverpod.

2. BACKEND

Use:

Node.js

Express.js

REST API

JWT

bcrypt/password hashing

Middleware

Role-based authorization

Input validation

Error handling

Environment variables

Backend structure:

backend/
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   └── app.js
├── database/
├── .env
├── package.json
└── server.js


3. DATABASE

Use MySQL as the main centralized production database.

Use SQLite for local/mobile storage and offline functionality where appropriate.

Important:

Do NOT duplicate the same production data unnecessarily between MySQL and SQLite.

Use MySQL for:

Users

Agencies

Buses

Routes

Stations

Trips

Seats

Bookings

Tickets

Payments

Notifications

Reports

Audit logs

Use SQLite locally in the Flutter application for:

Cached routes

Cached stations

Cached trips

User session information

Recent searches

Offline ticket information

Temporary booking data

App preferences

When internet connectivity is available, synchronize appropriate local data with the Node.js API.

4. SYSTEM USERS AND ROLES

Create these roles:

SUPER_ADMIN
AGENCY_ADMIN
PASSENGER


SUPER_ADMIN

The Super Admin controls the entire KATISHA BUS platform.

Can:

Manage all agencies

Manage all agency administrators

Manage passengers

Manage buses

Manage routes

Manage stations

Manage trips

View all bookings

View all payments

View all tickets

View all reports

View system statistics

Manage platform settings

Activate/deactivate agencies

View audit logs

5. AGENCY ADMINS

Each agency must have its own administrator.

Create:

HORIZON_ADMIN
VOLCANO_ADMIN
STELLA_ADMIN


However, implement them internally using the same:

AGENCY_ADMIN


role with an agency_id.

This means:

Agency Admin
     │
     ├── Horizon → agency_id = 1
     ├── Volcano → agency_id = 2
     └── Stella → agency_id = 3


An agency administrator can ONLY access information belonging to their agency.

For example:

Horizon Admin must NOT see:

Volcano buses

Volcano bookings

Stella passengers

Stella revenue

6. PASSENGER MOBILE APPLICATION

Build the passenger application using Flutter.

Application name:

KATISHA BUS

Tagline:

"Book Your Journey Across Rwanda"

7. FLUTTER SCREENS

Create these screens.

Authentication

Splash Screen

Welcome Screen

Login

Register

Forgot Password

OTP Verification

Reset Password

Main Application

Home

Search Bus

Search Results

Trip Details

Seat Selection

Passenger Information

Booking Summary

Payment

Booking Confirmation

My Tickets

Ticket Details

Booking History

Notifications

Profile

Settings

Help & Support

8. HOME SCREEN

Create a modern professional home page.

Display:

KATISHA BUS

Book your bus ticket easily across Rwanda.


Search component:

FROM
[ Nyabugogo ]

TO
[ Musanze ]

DATE
[ Select Date ]

PASSENGERS
[ 1 ]

[ SEARCH BUSES ]


Also display:

Popular destinations

Available agencies

Recent searches

Upcoming booking

Travel information

9. BUS SEARCH

Passengers should search using:

Departure station

Destination

Travel date

Number of passengers

Example:

From: Nyabugogo
To: Musanze
Date: 20 August 2026
Passengers: 1


Display results containing:

Agency

Bus

Departure

Arrival

Route

Price

Available seats

Bus type

Book button

Allow filtering by:

Agency

Price

Departure time

Arrival time

Available seats

10. AGENCIES

Create agency profiles for:

Horizon Express

Show:

Agency name

Logo

Description

Routes

Bus information

Available trips

Reviews

Volcano Express

Same functionality.

Stella Express

Same functionality.

The Super Admin should be able to modify agency information.

11. BUS MANAGEMENT

Agency Admin can:

Add bus

Edit bus

Delete/deactivate bus

View buses

Set bus number

Set bus type

Set seat capacity

Configure seats

Assign bus to route

Assign bus to trips

Bus information:

Bus ID
Bus Number
Agency
Bus Type
Seat Capacity
Registration Number
Status


Bus status:

ACTIVE
INACTIVE
MAINTENANCE


12. ROUTE MANAGEMENT

Agency Admin can:

Create route

Edit route

Delete route

Assign route to bus

View route

Route example:

Nyabugogo → Musanze
Nyabugogo → Huye
Nyabugogo → Rubavu


The Super Admin can manage all routes.

13. STATION MANAGEMENT

Initially include:

Nyabugogo Bus Station

Kigali Bus Station

Musanze Bus Station

Huye Bus Station

Rubavu Bus Station

Rusizi Bus Station

Muhanga Bus Station

Kayonza Bus Station

Super Admin can:

Add station

Edit station

Deactivate station

Delete station

14. TRIP AND SCHEDULE MANAGEMENT

Agency Admin can create trips.

Trip fields:

Agency
Bus
Route
Departure Station
Destination
Travel Date
Departure Time
Arrival Time
Ticket Price
Available Seats
Trip Status


Trip status:

SCHEDULED
BOARDING
DEPARTED
COMPLETED
CANCELLED


15. SEAT SELECTION

Create a visual bus seat layout.

Example:

      DRIVER

 A1   A2       A3   A4
 B1   B2       B3   B4
 C1   C2       C3   C4
 D1   D2       D3   D4
 E1   E2       E3   E4


Seat status:

AVAILABLE
SELECTED
BOOKED
RESERVED


Passengers can select seats.

The backend must prevent double booking.

Use database transactions/locking where necessary so two passengers cannot successfully reserve the same seat at the same time.

16. BOOKING SYSTEM

Booking process:

Search
   ↓
Select Trip
   ↓
Select Seat
   ↓
Passenger Information
   ↓
Booking Summary
   ↓
Payment
   ↓
Confirmation
   ↓
Digital Ticket


Generate unique booking reference:

KTB-2026-000001


Booking status:

PENDING
CONFIRMED
CANCELLED
COMPLETED


17. PAYMENT SYSTEM

Create a payment architecture suitable for Rwanda.

Support:

MTN Mobile Money

Airtel Money

Bank/Card payment

For development, initially implement a mock payment system.

Payment statuses:

PENDING
SUCCESSFUL
FAILED
REFUNDED


Do not store sensitive payment credentials.

Create a payment service layer so real payment APIs can be integrated later.

18. DIGITAL TICKET

After successful payment, generate a digital ticket.

Ticket contains:

KATISHA BUS

Passenger:
John Doe

Booking Reference:
KTB-2026-000001

Agency:
Horizon Express

Route:
Nyabugogo → Musanze

Date:
20 August 2026

Departure:
08:00 AM

Seat:
A3

Price:
5,000 RWF

Payment:
PAID


Include a QR code.

19. QR CODE VERIFICATION

Agency administrators should be able to verify tickets.

Scanner result:

Ticket: KTB-2026-000001

Passenger: John Doe
Agency: Horizon Express
Route: Nyabugogo → Musanze
Seat: A3
Date: 20 August 2026

Status: VALID


Possible results:

VALID
USED
CANCELLED
EXPIRED
NOT_FOUND


20. HORIZON ADMIN DASHBOARD

Create a separate dashboard for Horizon Express.

Dashboard cards:

Today's Bookings
Today's Revenue
Active Trips
Available Buses
Passengers
Cancelled Tickets


Modules:

Dashboard

Bus Management

Route Management

Station Management

Trip Management

Schedule Management

Seat Management

Booking Management

Ticket Management

Passenger Management

Payment Management

Reports

Notifications

Profile

21. VOLCANO ADMIN DASHBOARD

Create a separate Volcano Express dashboard.

Use exactly the same modules as Horizon.

But enforce:

agency_id = Volcano Express


Volcano Admin must only see Volcano data.

22. STELLA ADMIN DASHBOARD

Create a separate Stella Express dashboard.

Use exactly the same modules.

Enforce:

agency_id = Stella Express


Stella Admin must only see Stella data.

23. SUPER ADMIN DASHBOARD

Create a central Super Admin dashboard.

Dashboard should display:

Total Agencies
Total Passengers
Total Buses
Total Trips
Today's Bookings
Today's Revenue
Total Revenue
Cancelled Bookings


Use charts for:

Revenue by agency

Bookings by agency

Popular routes

Daily bookings

Monthly revenue

24. SUPER ADMIN AGENCY MANAGEMENT

Super Admin can:

Add agency

Edit agency

Activate agency

Deactivate agency

Create agency administrator

Edit agency administrator

Reset admin password

View agency statistics

Agency table:

Agency
Admin
Buses
Trips
Bookings
Revenue
Status
Actions


25. USER MANAGEMENT

Super Admin can manage:

Passengers

View

Search

Activate

Deactivate

Agency Admins

Create

Edit

Disable

Reset password

Never expose passwords.

26. REPORTING

Create professional reports.

Agency Admin reports:

Daily bookings

Weekly bookings

Monthly bookings

Daily revenue

Monthly revenue

Popular routes

Bus occupancy

Cancelled bookings

Super Admin reports:

Revenue by agency

Bookings by agency

Agency performance

Overall platform revenue

Popular destinations

Passenger statistics

Allow reports to be filtered by date.

27. NOTIFICATIONS

Create notification functionality.

Passenger notifications:

Booking confirmed

Payment successful

Trip reminder

Booking cancelled

Schedule changed

Admin notifications:

New booking

Cancellation

Payment received

System notification

28. OFFLINE SUPPORT WITH SQLITE

The Flutter application should use SQLite for local storage.

Store locally:

Recently searched routes

Stations

Cached trips

User preferences

Current session

Tickets

Temporary booking information

When internet is unavailable:

Display cached information where possible.

Show an offline indicator.

Prevent unsafe final booking/payment operations unless the backend confirms the booking.

When connection returns:

Flutter SQLite
      ↓
Check Internet
      ↓
Node.js REST API
      ↓
MySQL
      ↓
Synchronization


Do not allow offline bookings to create duplicate reservations.

29. DATABASE TABLES

Create a normalized MySQL database with tables including:

users
roles
agencies
agency_admins
passengers
stations
buses
bus_seats
routes
trips
bookings
booking_seats
tickets
payments
notifications
reviews
audit_logs


Important relationships:

Agency
  ↓
Buses
  ↓
Trips
  ↓
Seats
  ↓
Bookings
  ↓
Tickets
  ↓
Payments


And:

Passenger
    ↓
Bookings
    ↓
Tickets


30. REST API

Create APIs such as:

Authentication

POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/forgot-password


Passenger

GET /api/trips/search
GET /api/trips/:id
GET /api/trips/:id/seats

POST /api/bookings
GET /api/bookings
GET /api/bookings/:id
POST /api/bookings/:id/cancel

POST /api/payments
GET /api/payments/:id

GET /api/tickets
GET /api/tickets/:id


Agency Admin

GET /api/admin/dashboard

GET /api/admin/buses
POST /api/admin/buses
PUT /api/admin/buses/:id
DELETE /api/admin/buses/:id

GET /api/admin/routes
POST /api/admin/routes
PUT /api/admin/routes/:id

GET /api/admin/trips
POST /api/admin/trips
PUT /api/admin/trips/:id

GET /api/admin/bookings
GET /api/admin/tickets
GET /api/admin/reports


Super Admin

GET /api/super-admin/dashboard

GET /api/super-admin/agencies
POST /api/super-admin/agencies
PUT /api/super-admin/agencies/:id
DELETE /api/super-admin/agencies/:id

GET /api/super-admin/users
GET /api/super-admin/reports


31. SECURITY

Implement:

JWT authentication

Password hashing using bcrypt

Role-based authorization

Agency-level data isolation

API validation

SQL injection protection

CORS configuration

Rate limiting where appropriate

Secure environment variables

Audit logging

Important security rule:

SUPER_ADMIN
→ All agencies

AGENCY_ADMIN
→ Own agency only

PASSENGER
→ Own account and bookings only


32. FLUTTER API CONFIGURATION

Create a centralized API configuration.

Example:

API_BASE_URL

Development:
http://10.0.2.2:3000/api

Production:
https://your-production-api.com/api


Do not hard-code API URLs throughout the application.

Create an API service layer such as:

AuthService
AgencyService
TripService
BookingService
PaymentService
TicketService
NotificationService


33. UI DESIGN

Use a modern professional transportation design.

Main colors should be inspired by Rwanda but keep the design clean and professional.

Use:

Material 3

Cards

Bottom navigation

Icons

Tables

Charts

Search fields

Date pickers

Dropdowns

Dialogs

Loading states

Error states

Empty states

The application should NOT look like a basic student demo.

34. MOBILE NAVIGATION

Use bottom navigation:

Home
Search
My Tickets
Notifications
Profile


35. ADMIN NAVIGATION

Use sidebar navigation:

Dashboard
Buses
Routes
Stations
Trips
Schedules
Bookings
Tickets
Passengers
Payments
Reports
Notifications
Settings
Logout


For Super Admin additionally include:

Agencies
Agency Admins
All Users
Platform Reports
Audit Logs
System Settings


36. SAMPLE DATA

Create seed data for:

Agencies

Horizon Express
Volcano Express
Stella Express


Stations

Nyabugogo
Kigali
Musanze
Huye
Rubavu
Rusizi
Muhanga
Kayonza


Create sample:

Buses

Routes

Trips

Seats

Passengers

Bookings

Create test accounts:

Super Admin
Agency Admin — Horizon
Agency Admin — Volcano
Agency Admin — Stella
Passenger


Use clearly documented development credentials and require changing them before production.

37. PROJECT FOLDER STRUCTURE

Create the project using:

KATISHA_BUS/
│
├── mobile/
│   └── Flutter application
│
├── backend/
│   └── Node.js + Express API
│
├── database/
│   ├── migrations/
│   └── seeders/
│
├── admin-dashboard/
│   └── Admin/Super Admin web interface
│
└── README.md


38. DEVELOPMENT ORDER

Build the project in this order:

Phase 1

Database architecture.

Phase 2

Node.js backend.

Phase 3

Authentication and authorization.

Phase 4

Agency management.

Phase 5

Bus management.

Phase 6

Station and route management.

Phase 7

Trip and schedule management.

Phase 8

Flutter passenger application.

Phase 9

Seat selection.

Phase 10

Booking system.

Phase 11

Payment mock system.

Phase 12

Digital ticket and QR code.

Phase 13

Agency dashboards.

Phase 14

Super Admin dashboard.

Phase 15

Reports and notifications.

Phase 16

SQLite offline caching and synchronization.

Phase 17

Testing and bug fixing.

39. IMPORTANT IMPLEMENTATION RULE

Do not create a UI prototype with fake buttons.

Implement functional:

Authentication

Database operations

API calls

CRUD operations

Search

Seat availability

Booking

Payment simulation

Ticket generation

QR verification

Admin authorization

Super Admin authorization

Reports

Every important button should perform its intended action.

Use realistic sample data during development.

40. FINAL GOAL

The completed system should allow this complete workflow:

PASSENGER

Open Flutter App
       ↓
Register/Login
       ↓
Search Bus
       ↓
Choose Horizon / Volcano / Stella
       ↓
Select Trip
       ↓
Select Seat
       ↓
Enter Passenger Information
       ↓
Confirm Booking
       ↓
Make Payment
       ↓
Booking Confirmed
       ↓
Digital QR Ticket
       ↓
Travel
       ↓
Agency scans QR ticket


At the same time:

AGENCY ADMIN

Login
   ↓
Agency Dashboard
   ↓
Manage Buses
   ↓
Manage Routes
   ↓
Create Trips
   ↓
Manage Seats
   ↓
View Bookings
   ↓
Verify Tickets
   ↓
View Revenue
   ↓
Generate Reports


And:

SUPER ADMIN

Login
   ↓
Super Admin Dashboard
   ↓
Manage Horizon
Manage Volcano
Manage Stella
   ↓
Manage All Users
   ↓
Monitor Bookings
   ↓
Monitor Payments
   ↓
View Platform Revenue
   ↓
Generate Global Reports
   ↓
Manage Entire System


Build this as a complete full-stack application, not just a visual prototype. Prioritize a clean architecture, secure role-based access, correct database relationships, working REST APIs, and a Flutter application that can communicate with the Node.js backend.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/852e8a9f-61da-40c3-beb2-b311e7ba58f7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
