# RideSync Backend

A ride-sharing coordination REST API built with Node.js, TypeScript, Express, PostgreSQL, Redis, and BullMQ. Deployed on Azure App Service.

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (via Prisma ORM)
- **Cache**: Redis (via ioredis)
- **Queue**: BullMQ
- **Auth**: JWT (access + refresh token flow)
- **Deployment**: Azure App Service + GitHub Actions CI/CD

## Project Structure

src/
├── config/         # Database, Redis, env configuration
├── controllers/    # Route handlers
├── middlewares/    # Auth, error handler
├── routes/         # Express routers
├── services/       # Business logic
├── workers/        # BullMQ job workers
├── utils/          # JWT, hash helpers
└── types/          # TypeScript interfaces

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 16
- Redis

### Installation

```bash
git clone https://github.com/YOUR_USERNAME/ridesync-backend.git
cd ridesync-backend
npm install
```

### Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Secret for access tokens |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens |
| `JWT_ACCESS_EXPIRES_IN` | Access token expiry (e.g. `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry (e.g. `7d`) |
| `REDIS_URL` | Redis connection URL |
| `PORT` | Server port (default: 5000) |
| `NODE_ENV` | `development` or `production` |
| `FRONTEND_URL` | Frontend origin for CORS |

### Database Setup

```bash
npx prisma migrate dev
npx prisma generate
```

### Run in Development

```bash
npm run dev
```

### Build for Production

```bash
npm run build
npm start
```

## API Endpoints

### Auth

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/auth/register` | Register a new user | No |
| POST | `/api/auth/login` | Login and get tokens | No |
| POST | `/api/auth/refresh` | Refresh access token | No |
| POST | `/api/auth/logout` | Logout user | Yes |

### Rides

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/rides` | Create a ride | Yes |
| GET | `/api/rides` | Search rides | Yes |
| GET | `/api/rides/my` | Get my offered rides | Yes |
| GET | `/api/rides/:id` | Get ride details | Yes |
| PATCH | `/api/rides/:id/cancel` | Cancel a ride | Yes |

### Bookings *(coming soon)*

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/rides/:id/book` | Book a seat | Yes |
| GET | `/api/bookings/my` | Get my bookings | Yes |
| PATCH | `/api/bookings/:id/cancel` | Cancel a booking | Yes |

## Database Schema

- **User** — registered users (drivers and passengers)
- **Ride** — ride listings with origin, destination, seats, price
- **Booking** — seat reservations linked to rides and users
- **Notification** — in-app alerts for booking events

## Deployment

Deployed on **Azure App Service** with **GitHub Actions** CI/CD. Every push to `main` triggers an automated build and deployment pipeline.

