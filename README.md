# RideSync Backend

RideSync is a campus ride-sharing platform built for KIIT University students. This is the REST API powering the platform — handling authentication, ride management, booking logic, a smart matching engine, and async notification workers. Built with production-grade engineering standards using Node.js, TypeScript, Express, PostgreSQL, Redis, and BullMQ.

## Features

- **JWT Authentication**: Full access + refresh token flow. Access tokens expire in 15 minutes and are silently refreshed via httpOnly cookies. Refresh tokens are stored in Redis and invalidated on logout.
- **Ride Management**: Drivers can create rides with origin, destination, departure time, seat count and price. Rides are automatically marked as FULL when all seats are booked, and marked as COMPLETED by a cron job when departure time passes.
- **Smart Ride Matching**: The `/api/match` endpoint scores every active ride against a passenger's request using a multi-factor scoring engine — text similarity on origin/destination (30 pts each), Haversine geo proximity (20 pts), departure time closeness (20 pts), and seat availability ratio (10 pts). Results are ranked highest score first.
- **Booking Engine**: Passengers can book seats on active rides. The system prevents double-booking, blocks self-booking, and uses atomic Prisma transactions to decrement available seats and update ride status simultaneously — no race conditions.
- **BullMQ Workers**: Booking and cancellation events trigger async notification jobs processed by a BullMQ worker. Each job saves an in-app notification to the database and sends a transactional email via Nodemailer.
- **Ride Cleanup Cron**: A BullMQ repeatable job runs every hour to find rides whose departure time has passed and marks them as COMPLETED automatically.
- **Rate Limiting and Security**: Helmet for HTTP headers, CORS configured per environment, express-rate-limit on auth routes.

## How It Works

1. User registers — password is hashed with bcryptjs (12 rounds) and stored in PostgreSQL.
2. On login, an access token (JWT, 15 min) and refresh token (JWT, 7 days) are generated. The refresh token is stored in Redis under `refresh:{userId}` and sent as an httpOnly cookie.
3. Protected routes pass through the `authenticate` middleware which verifies the access token and attaches the user payload to the request.
4. When a passenger books a ride, a Prisma transaction atomically creates the booking and decrements `availableSeats`. If seats hit zero the ride status flips to FULL.
5. The booking service adds a job to the BullMQ `notifications` queue. The worker picks it up, creates a `Notification` record in PostgreSQL, and sends an email.
6. Every hour the cleanup worker queries for rides with `departureTime < now` and status `ACTIVE` or `FULL`, and bulk-updates them to `COMPLETED`.
7. The matching engine pulls all ACTIVE rides with enough seats, scores each one against the passenger's filters, filters out zero-score rides, and returns them sorted descending by score with human-readable `reasons` strings.

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL 16 via Prisma ORM
- **Cache**: Redis via ioredis
- **Queue**: BullMQ
- **Auth**: JWT (access + refresh token flow)
- **Email**: Nodemailer with SMTP