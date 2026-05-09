# RideFlow Backend

A production-grade ride-hailing platform backend built with the **MERN stack (MySQL edition)**.

> **Stack:** Node.js · Express.js · MySQL (mysql2) · React.js *(frontend — future phase)*

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env
# Edit .env with your MySQL credentials and secrets

# 3. Set up the database
# Run rideflow_DB.sql in your MySQL client, then:
# ALTER TABLE User ADD COLUMN refresh_token TEXT DEFAULT NULL;
# ALTER TABLE User ADD COLUMN profile_photo VARCHAR(255) DEFAULT NULL;

# 4. Start the development server
npm run dev
```

## API Endpoints (Phase 1)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/auth/register` | No | Register Rider or Driver |
| POST | `/api/v1/auth/login` | No | Login |
| POST | `/api/v1/auth/logout` | Yes | Logout |
| POST | `/api/v1/auth/refresh-token` | No | Refresh access token |
| GET | `/api/v1/auth/me` | Yes | Get current user |
| GET | `/health` | No | Health check |

## Project Structure

```
src/
├── config/         # Database configuration
├── controllers/    # Route handlers (thin controllers)
├── db/             # MySQL pool
├── middlewares/    # JWT auth, validation, file upload
├── models/         # Raw SQL query functions (no ORM)
├── routes/         # Express routers
├── utils/          # ApiError, ApiResponse, asyncHandler, cloudinary, tokenUtils
└── validators/     # Joi schemas
```
