# RideFlow — AI IDE Prompt
### MERN Stack (MySQL Edition) | Database Systems Lab Spring 2026
---

## CONTEXT & OBJECTIVE

You are being given full context of a university-level database systems project called **RideFlow** — a ride-hailing platform inspired by Uber and Careem. The project is built using the **MERN stack**, but with a twist: **M stands for MySQL** (not MongoDB). The rest of the stack is standard: **Express.js**, **React.js**, and **Node.js**.

A base backend project exists (originally built with MongoDB + Mongoose). Your job is to **fully migrate, restructure, and rewrite** this project into a clean, professional, production-grade codebase using **MySQL** as the database, while keeping everything that is already correct and professional.

This prompt covers **Phase 1 only**: Project scaffolding, MySQL database connection, role-based registration, login, logout, full validation, and JWT-based authentication. Nothing more. We build slowly, correctly, and professionally.

---

## EXISTING CODEBASE (MONGODB VERSION) — ANALYSIS

The existing backend project has the following structure and should serve as a reference, **not** as code to blindly keep:

```
Backend_Project/
├── src/
│   ├── app.js                     ✅ Keep — Express setup is clean
│   ├── index.js                   ✅ Keep structure, replace DB connection
│   ├── constants.js               ✅ Keep, update constants
│   ├── controllers/
│   │   └── user.controller.js     🔄 Rewrite for MySQL
│   ├── db/
│   │   └── index.js               🔄 Rewrite — replace Mongoose with mysql2
│   ├── middlewares/
│   │   ├── auth.middleware.js      🔄 Rewrite — remove MongoDB reference
│   │   └── multer.middleware.js    ✅ Keep (file uploads still needed)
│   ├── models/
│   │   └── user.models.js         🔄 Rewrite — no Mongoose schema, use SQL
│   ├── routes/
│   │   └── user.routes.js         🔄 Rewrite — role-based routing
│   └── utils/
│       ├── ApiError.js            ✅ Keep — perfectly written
│       ├── ApiResponse.js         ✅ Keep — perfectly written
│       ├── asyncHandler.js        ✅ Keep — perfectly written
│       └── claudinary.js          ⚠️ Rename to cloudinary.js, keep logic
├── public/temp/                   ✅ Keep
├── .env                           🔄 Update — replace MongoDB vars with MySQL
├── package.json                   🔄 Update — replace mongoose with mysql2/sequelize
└── .prettierrc                    ✅ Keep
```

---

## EXISTING MySQL DATABASE SCHEMA

The database `RideFlowDB` is already designed. Do **not** recreate it from scratch unless a modification is needed. Here is the full DDL:

```sql
CREATE DATABASE RideFlowDB;
USE RideFlowDB;

CREATE TABLE User (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(15) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('Admin', 'Rider', 'Driver') NOT NULL,
    account_status ENUM('Active', 'Suspended', 'Banned') DEFAULT 'Active',
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Driver (
    driver_id INT PRIMARY KEY,
    license_number VARCHAR(50) NOT NULL UNIQUE,
    cnic VARCHAR(20) NOT NULL UNIQUE,
    profile_photo VARCHAR(255),
    verification_status ENUM('Pending', 'Verified', 'Rejected') DEFAULT 'Pending',
    availability_status ENUM('Online', 'Offline', 'On Trip') DEFAULT 'Offline',
    total_trips INT DEFAULT 0 CHECK (total_trips >= 0),
    avg_rating DECIMAL(2,1) DEFAULT 5.0 CHECK (avg_rating BETWEEN 0 AND 5),
    FOREIGN KEY (driver_id) REFERENCES User(user_id) ON DELETE CASCADE
);

CREATE TABLE Vehicle (
    vehicle_id INT AUTO_INCREMENT PRIMARY KEY,
    driver_id INT NOT NULL,
    make VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    year INT NOT NULL CHECK (year >= 2000),
    color VARCHAR(30),
    license_plate VARCHAR(20) NOT NULL UNIQUE,
    vehicle_type ENUM('Economy', 'Premium', 'Bike') NOT NULL,
    verification_status ENUM('Pending', 'Verified', 'Rejected') DEFAULT 'Pending',
    FOREIGN KEY (driver_id) REFERENCES Driver(driver_id) ON DELETE CASCADE
);

CREATE TABLE Ride (
    ride_id INT AUTO_INCREMENT PRIMARY KEY,
    rider_id INT NOT NULL,
    driver_id INT,
    vehicle_id INT,
    pickup_location VARCHAR(255) NOT NULL,
    dropoff_location VARCHAR(255) NOT NULL,
    status ENUM('Requested', 'Accepted', 'Driver En Route', 'In Progress', 'Completed', 'Cancelled') DEFAULT 'Requested',
    request_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    start_time TIMESTAMP NULL,
    end_time TIMESTAMP NULL,
    fare DECIMAL(10,2) CHECK (fare >= 0),
    FOREIGN KEY (rider_id) REFERENCES User(user_id),
    FOREIGN KEY (driver_id) REFERENCES Driver(driver_id),
    FOREIGN KEY (vehicle_id) REFERENCES Vehicle(vehicle_id)
);

CREATE TABLE Ride_History (
    history_id INT AUTO_INCREMENT PRIMARY KEY,
    ride_id INT NOT NULL UNIQUE,
    final_status ENUM('Completed', 'Cancelled') NOT NULL,
    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ride_id) REFERENCES Ride(ride_id) ON DELETE CASCADE
);

CREATE TABLE Promo_Code (
    code VARCHAR(20) PRIMARY KEY,
    discount_type ENUM('Percent', 'Flat') NOT NULL,
    discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),
    min_ride_amount DECIMAL(10,2) DEFAULT 0,
    expiry_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE Payment (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    ride_id INT NOT NULL UNIQUE,
    rider_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    payment_method ENUM('Cash', 'Wallet', 'Card') NOT NULL,
    payment_status ENUM('Pending', 'Paid', 'Failed', 'Refunded') DEFAULT 'Pending',
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    promo_code VARCHAR(20),
    discount_amount DECIMAL(10,2) DEFAULT 0 CHECK (discount_amount >= 0),
    FOREIGN KEY (ride_id) REFERENCES Ride(ride_id),
    FOREIGN KEY (rider_id) REFERENCES User(user_id),
    FOREIGN KEY (promo_code) REFERENCES Promo_Code(code)
);

CREATE TABLE Rating (
    rating_id INT AUTO_INCREMENT PRIMARY KEY,
    ride_id INT NOT NULL,
    rated_by ENUM('Rider', 'Driver') NOT NULL,
    rated_user_id INT NOT NULL,
    score INT NOT NULL CHECK (score BETWEEN 1 AND 5),
    comment TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ride_id) REFERENCES Ride(ride_id),
    FOREIGN KEY (rated_user_id) REFERENCES User(user_id)
);

CREATE TABLE Wallet (
    wallet_id INT AUTO_INCREMENT PRIMARY KEY,
    driver_id INT NOT NULL UNIQUE,
    balance DECIMAL(10,2) DEFAULT 0 CHECK (balance >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (driver_id) REFERENCES Driver(driver_id) ON DELETE CASCADE
);

CREATE TABLE Admin_Log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL,
    action VARCHAR(255) NOT NULL,
    target_table VARCHAR(50),
    target_id INT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES User(user_id)
);
```

### Required Schema Additions
Add these two columns to the `User` table for JWT-based session management:

```sql
ALTER TABLE User ADD COLUMN refresh_token TEXT DEFAULT NULL;
ALTER TABLE User ADD COLUMN profile_photo VARCHAR(255) DEFAULT NULL;
```

---

## PHASE 1 — PROJECT SCAFFOLDING, DB CONNECTION & AUTH SYSTEM

### Phase 1 Objectives
- Set up the complete project folder structure for a scalable MERN + MySQL app
- Connect Node.js backend to MySQL using `mysql2` with a connection pool
- Implement role-based registration for all three roles: `Rider`, `Driver`, `Admin`
- Implement login with JWT (access token + refresh token)
- Implement logout with token invalidation
- Implement all validations and authentication middleware
- Write everything clean, commented, and production-grade

---

## TARGET FOLDER STRUCTURE

Restructure the project into the following layout. Create all files even if some are empty placeholders for now:

```
rideflow-backend/
├── src/
│   ├── config/
│   │   └── db.config.js           # MySQL pool configuration
│   ├── controllers/
│   │   ├── auth.controller.js     # register, login, logout, refreshToken
│   │   └── admin.controller.js    # placeholder for Phase 2
│   ├── db/
│   │   └── index.js               # MySQL pool creation and export
│   ├── middlewares/
│   │   ├── auth.middleware.js     # JWT verification, role guard
│   │   ├── multer.middleware.js   # file upload config (kept from original)
│   │   └── validate.middleware.js # request body validation middleware
│   ├── models/
│   │   └── user.model.js          # SQL query functions (no ORM)
│   ├── routes/
│   │   ├── index.js               # master router
│   │   └── auth.routes.js         # /register, /login, /logout, /refresh-token
│   ├── utils/
│   │   ├── ApiError.js            # keep from original
│   │   ├── ApiResponse.js         # keep from original
│   │   ├── asyncHandler.js        # keep from original
│   │   ├── cloudinary.js          # renamed from claudinary.js, keep logic
│   │   └── tokenUtils.js          # JWT generation helpers
│   ├── validators/
│   │   └── auth.validators.js     # Joi/express-validator schemas
│   ├── app.js                     # Express app setup
│   ├── constants.js               # app-wide constants (roles, statuses, etc.)
│   └── index.js                   # entry point
├── public/
│   └── temp/                      # temporary file upload storage
├── .env                           # environment variables
├── .env.example                   # env template (no secrets)
├── .gitignore                     # proper Node.js gitignore
├── .prettierrc                    # keep from original
├── .prettierignore                # keep from original
├── package.json                   # updated dependencies
└── README.md                      # project readme placeholder
```

---

## IMPLEMENTATION SPECIFICATIONS

### 1. Dependencies (`package.json`)

Remove: `mongoose`, `mongoose-aggregate-paginate-v2`
Add: `mysql2`, `joi`
Keep: `bcrypt`, `jsonwebtoken`, `express`, `cors`, `cookie-parser`, `dotenv`, `multer`, `cloudinary`, `nodemon`, `prettier`

```json
{
  "name": "rideflow-backend",
  "version": "1.0.0",
  "description": "RideFlow — Ride-hailing platform backend. MERN stack with MySQL.",
  "type": "module",
  "main": "src/index.js",
  "scripts": {
    "dev": "nodemon src/index.js",
    "start": "node src/index.js"
  },
  "author": "RideFlow Dev Team",
  "license": "ISC"
}
```

---

### 2. Environment Variables (`.env`)

```env
# Server
PORT=8000
CORS_ORIGIN=http://localhost:5173

# MySQL Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=RideFlowDB
DB_CONNECTION_LIMIT=10

# JWT
ACCESS_TOKEN_SECRET=your_strong_access_token_secret_here
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=your_strong_refresh_token_secret_here
REFRESH_TOKEN_EXPIRY=10d

# Cloudinary (for profile photos)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Also create `.env.example` with the same keys but empty values.

---

### 3. `src/constants.js`

```js
export const DB_NAME = "RideFlowDB";

export const USER_ROLES = {
  ADMIN: "Admin",
  RIDER: "Rider",
  DRIVER: "Driver",
};

export const ACCOUNT_STATUS = {
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  BANNED: "Banned",
};

export const VERIFICATION_STATUS = {
  PENDING: "Pending",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
};
```

---

### 4. `src/db/index.js` — MySQL Connection Pool

Use `mysql2/promise` for async/await support. Create a **connection pool** (not a single connection) for scalability.

```js
// Uses mysql2/promise for async/await
// Creates a pool with config from .env
// Exports pool for use across models
// Logs connection success or exits process on failure
// Tests connection on startup using pool.getConnection()
```

The pool config must read from `.env` using `process.env`. On failure, log the error and call `process.exit(1)`.

---

### 5. `src/models/user.model.js` — SQL Query Functions

**No ORM.** Write raw SQL queries as exported async functions. This is intentional for a database course project.

Required functions:

```js
// findUserByEmail(email)         → SELECT by email
// findUserByPhone(phone)         → SELECT by phone
// findUserById(userId)           → SELECT by user_id
// createUser(userData)           → INSERT into User table, return insertId
// createDriverProfile(driverData) → INSERT into Driver table (for driver registration)
// createWallet(driverId)         → INSERT into Wallet for new driver
// updateRefreshToken(userId, token) → UPDATE refresh_token in User table
// clearRefreshToken(userId)      → SET refresh_token = NULL
// findUserByRefreshToken(token)  → SELECT where refresh_token matches
```

All functions must:
- Use the pool from `src/db/index.js`
- Use parameterized queries (`?` placeholders) — **never string concatenation** (SQL injection prevention)
- Return plain objects (the first element of `pool.execute()` result)
- Be wrapped in try/catch and throw `ApiError` on DB failure

---

### 6. `src/utils/tokenUtils.js`

```js
// generateAccessToken(payload)  → signs JWT with ACCESS_TOKEN_SECRET
// generateRefreshToken(payload) → signs JWT with REFRESH_TOKEN_SECRET
// verifyAccessToken(token)      → verifies and returns decoded payload
// verifyRefreshToken(token)     → verifies and returns decoded payload
```

Payload for access token must include: `{ userId, email, role }`
Payload for refresh token must include: `{ userId }`

---

### 7. `src/validators/auth.validators.js`

Use **Joi** for schema validation. Create schemas for:

**Rider Registration:**
- `full_name`: string, min 2, max 100, required
- `email`: valid email format, required
- `phone`: string, min 10, max 15, numeric only, required
- `password`: min 8 chars, at least one uppercase, one number, one special char, required

**Driver Registration** (extends Rider):
- All Rider fields
- `license_number`: string, required
- `cnic`: string, exactly 13-15 digits (Pakistani format: XXXXX-XXXXXXX-X), required

**Login:**
- `email`: valid email, required
- `password`: string, min 1, required

Export each as a Joi schema object.

---

### 8. `src/middlewares/validate.middleware.js`

A reusable middleware factory:

```js
// validateBody(schema) → returns Express middleware that validates req.body against Joi schema
// On validation failure: throws ApiError(400, "Validation Error", errors array)
// On success: calls next()
```

---

### 9. `src/middlewares/auth.middleware.js`

Two middleware functions:

**`verifyJWT`:**
- Reads access token from `req.cookies.accessToken` OR `Authorization: Bearer <token>` header
- Verifies token using `verifyAccessToken()`
- Fetches user from DB using `findUserById(decoded.userId)`
- Checks `account_status !== 'Banned'` and `!== 'Suspended'`
- Attaches `req.user` with `{ userId, email, role, full_name, account_status }`
- Throws `ApiError(401)` on any failure

**`authorizeRoles(...roles)`:**
- Factory function: `authorizeRoles('Admin', 'Driver')` returns middleware
- Checks `req.user.role` is in allowed roles
- Throws `ApiError(403, "Access denied")` if not

---

### 10. `src/controllers/auth.controller.js`

**`registerUser`** — Role-based registration:

```
Flow:
1. Read role from req.body (default: 'Rider' if not provided, Admin cannot self-register)
2. Validate input using appropriate Joi schema based on role
3. Check for duplicate email → ApiError(409)
4. Check for duplicate phone → ApiError(409)
5. If Driver: also check duplicate license_number and cnic
6. Hash password using bcrypt (saltRounds: 12)
7. Handle optional profile_photo upload via Cloudinary (if file provided)
8. INSERT into User table → get user_id
9. If role === 'Driver':
   a. INSERT into Driver table (driver_id = user_id from step 8)
   b. INSERT into Wallet table (driver_id = user_id, balance = 0)
10. Generate accessToken and refreshToken
11. Store refreshToken in DB via updateRefreshToken()
12. Return ApiResponse(201) with user data (exclude password_hash, refresh_token)
13. Set httpOnly cookies for both tokens
```

**`loginUser`:**

```
Flow:
1. Validate input (email + password required)
2. Find user by email → ApiError(404) if not found
3. Check account_status: 'Banned' → ApiError(403), 'Suspended' → ApiError(403)
4. Compare password with bcrypt.compare()
5. Generate new accessToken and refreshToken
6. Update refreshToken in DB
7. Return ApiResponse(200) with user info (no sensitive fields)
8. Set httpOnly cookies
```

**`logoutUser`** (protected — requires verifyJWT):

```
Flow:
1. Get userId from req.user
2. Clear refreshToken in DB via clearRefreshToken()
3. Clear cookies (accessToken, refreshToken)
4. Return ApiResponse(200, {}, "Logged out successfully")
```

**`refreshAccessToken`:**

```
Flow:
1. Read refreshToken from req.cookies.refreshToken or req.body.refreshToken
2. Verify with verifyRefreshToken() → ApiError(401) if invalid/expired
3. Find user by refresh token in DB → ApiError(401) if not found
4. Generate new accessToken (and optionally rotate refreshToken)
5. Update DB if rotating
6. Return new accessToken in cookie and response body
```

**`getCurrentUser`** (protected):

```
Flow:
1. req.user is already set by verifyJWT middleware
2. Fetch fresh user data from DB (to get current status)
3. Return ApiResponse(200) with user info
```

---

### 11. `src/routes/auth.routes.js`

```
POST   /register           → validateBody(registrationSchema) → registerUser
POST   /login              → validateBody(loginSchema) → loginUser
POST   /logout             → verifyJWT → logoutUser
POST   /refresh-token      → refreshAccessToken
GET    /me                 → verifyJWT → getCurrentUser
```

---

### 12. `src/routes/index.js` — Master Router

```js
// Mounts all route modules under versioned prefix
// /api/v1/auth → auth.routes.js
// (future routes will be added here in later phases)
```

---

### 13. `src/app.js`

Keep the professional setup from the original. Update:
- CORS origin from env
- Import master router from `routes/index.js`
- Mount at `/api/v1`
- Add a global error handler middleware at the bottom:

```js
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  return res.status(statusCode).json(
    new ApiResponse(statusCode, null, message)
  );
});
```

---

### 14. `src/index.js` — Entry Point

```js
// 1. Load dotenv
// 2. Import MySQL pool and call pool.getConnection() to test connection
// 3. If connection OK → start Express server
// 4. Log: "MySQL Connected | Server running on port X"
// 5. On DB failure → log error → process.exit(1)
```

---

## COOKIE CONFIGURATION

Both `accessToken` and `refreshToken` cookies must be set with:

```js
const cookieOptions = {
  httpOnly: true,       // not accessible via JS
  secure: process.env.NODE_ENV === "production",  // HTTPS only in prod
  sameSite: "strict",   // CSRF protection
  maxAge: 24 * 60 * 60 * 1000  // 1 day for access token
};
```

Use longer `maxAge` for refresh token (10 days).

---

## SECURITY REQUIREMENTS

- **Never** return `password_hash` or `refresh_token` in any API response
- All SQL queries must use parameterized placeholders (`?`) — no string template literals with user input
- bcrypt salt rounds: **12** (production-grade)
- JWT secrets must be at least 64 characters (enforced via startup check)
- Rate limiting: Add `express-rate-limit` on `/login` and `/register` routes (max 10 req/15min per IP)
- Add `helmet` for HTTP security headers

Add `express-rate-limit` and `helmet` to dependencies.

---

## ERROR HANDLING STANDARD

Use the existing `ApiError` class from the original project. All errors must:
- Use proper HTTP status codes (400 bad request, 401 unauthorized, 403 forbidden, 404 not found, 409 conflict, 500 server error)
- Have descriptive messages
- Be caught by the global error handler in `app.js`

The existing `asyncHandler` wraps all async controller functions to catch unhandled promise rejections.

---

## CODE STYLE & QUALITY REQUIREMENTS

- **ES Modules** (`import`/`export`) — already set via `"type": "module"` in package.json
- Use `async/await` everywhere — no `.then()/.catch()` chains in business logic
- Every file must have a brief JSDoc comment at the top explaining its purpose
- Functions must have JSDoc comments explaining parameters and return values
- No unused imports or variables
- Consistent naming: `camelCase` for variables/functions, `PascalCase` for classes, `SCREAMING_SNAKE_CASE` for constants
- Keep controllers thin — business logic stays in models/utils
- `.prettierrc` from original applies to all new files

---

## DOCUMENTATION REQUIREMENT — IMPORTANT

After implementing every file and function, write a **`IMPLEMENTATION_LOG.md`** file at the project root. This file will be used directly for the university project report. Format it strictly as follows:

```markdown
# RideFlow — Implementation Log

## Phase 1: Project Scaffolding, Database Connection & Authentication System

### Phase 1.0 — Project Overview & Tech Stack
- Project name, purpose, team
- Tech stack table (Technology | Version | Purpose)
- Architecture overview (diagram in ASCII or description)

### Phase 1.1 — Project Structure & Scaffolding
- Folder structure explanation
- What was kept from the original project and why
- What was removed and why (MongoDB/Mongoose removal rationale)
- Dependencies added/removed with justification

### Phase 1.2 — MySQL Database Connection
- Connection strategy: connection pool vs single connection (why pool?)
- `mysql2` vs alternatives (why mysql2/promise?)
- Pool configuration parameters and what each does
- Error handling on startup — fail-fast pattern

### Phase 1.3 — Schema Modifications
- Any ALTER TABLE statements added and why
- `refresh_token` column rationale
- `profile_photo` column rationale

### Phase 1.4 — User Model (Raw SQL Layer)
- Why no ORM was used (aligns with DB course objectives)
- SQL injection prevention — parameterized queries explained
- List of all query functions with their SQL and purpose

### Phase 1.5 — Validation Layer (Joi)
- Validation strategy overview
- Each schema explained (Rider, Driver, Login)
- Why Joi was chosen over express-validator

### Phase 1.6 — Authentication System
- JWT strategy: access token + refresh token pattern explained
- Why two tokens? (security rationale)
- Token storage: httpOnly cookies (why not localStorage?)
- bcrypt rounds: 12 — why not 10 or 15?
- Role-based registration flow (step-by-step for each role)
- Login flow (step-by-step)
- Logout flow
- Token refresh flow

### Phase 1.7 — Middleware Architecture
- `verifyJWT` — how it works
- `authorizeRoles` — factory pattern explained
- `validateBody` — schema validation middleware

### Phase 1.8 — Security Measures
- `helmet` — what headers it sets and why
- `express-rate-limit` — config and why on auth routes
- CORS configuration
- Cookie security flags (httpOnly, secure, sameSite)
- SQL injection prevention
- Password hashing rationale

### Phase 1.9 — API Endpoints Reference
| Method | Endpoint | Auth Required | Role | Description |
|--------|----------|---------------|------|-------------|
| POST | /api/v1/auth/register | No | Any | Register new user |
| POST | /api/v1/auth/login | No | Any | Login |
| POST | /api/v1/auth/logout | Yes | Any | Logout |
| POST | /api/v1/auth/refresh-token | No | Any | Get new access token |
| GET | /api/v1/auth/me | Yes | Any | Get current user |

### Phase 1.10 — Known Limitations & Future Work
- What is NOT implemented in this phase (and why)
- Planned improvements for Phase 2

---
*(Future phases will be added below as Phase 2, Phase 2.1, etc.)*
```

**This file must be kept updated throughout the entire project lifecycle. Every new phase adds its own section.**

---

## TESTING CHECKLIST

Before considering Phase 1 complete, manually verify:

- [ ] Server starts and MySQL connection succeeds (logs correct host/DB name)
- [ ] `POST /api/v1/auth/register` with role `Rider` — creates user, returns 201, no password in response
- [ ] `POST /api/v1/auth/register` with role `Driver` — creates User + Driver + Wallet rows, returns 201
- [ ] `POST /api/v1/auth/register` with duplicate email — returns 409
- [ ] `POST /api/v1/auth/register` with missing fields — returns 400 with validation error list
- [ ] `POST /api/v1/auth/register` with weak password — returns 400
- [ ] `POST /api/v1/auth/login` with correct credentials — returns 200, sets cookies, returns tokens
- [ ] `POST /api/v1/auth/login` with wrong password — returns 401
- [ ] `POST /api/v1/auth/login` with non-existent email — returns 404
- [ ] `GET /api/v1/auth/me` with valid access token cookie — returns 200 with user info
- [ ] `GET /api/v1/auth/me` with no token — returns 401
- [ ] `POST /api/v1/auth/logout` with valid token — returns 200, clears cookies, refresh_token set to NULL in DB
- [ ] `POST /api/v1/auth/refresh-token` with valid refresh token — returns new access token
- [ ] Admin cannot be registered via `/register` endpoint (return 403 or ignore role: 'Admin')
- [ ] Rate limit: 11th login attempt within 15 min from same IP returns 429

---

## WHAT NOT TO DO

- **Do not** use Mongoose, Sequelize, Prisma, or any ORM — raw `mysql2` queries only
- **Do not** use `var` — only `const` and `let`
- **Do not** leave `console.log` debug statements in production code (use them during dev, note where)
- **Do not** store passwords in plain text — always hash with bcrypt
- **Do not** put secrets in code — always use `.env`
- **Do not** use string concatenation in SQL queries — always parameterized queries
- **Do not** return sensitive fields (`password_hash`, `refresh_token`) in API responses
- **Do not** implement anything beyond Phase 1 scope — no ride management, no payments, no dashboards yet
- **Do not** skip the `IMPLEMENTATION_LOG.md` — it is required for the university report

---

## FINAL NOTES

- This is a university Database Systems Lab project. The use of raw SQL (no ORM) is intentional and required to demonstrate understanding of database concepts.
- The grading rubric requires demonstration of: Basic SQL, Aggregates, Joins, Views, Stored Procedures, Triggers, Events, and DCL (GRANT/REVOKE). These will be implemented in later phases.
- The backend will eventually connect to a React frontend (also to be built in later phases).
- Keep the codebase modular and scalable. Every decision made now affects how cleanly future phases can be added.
- Cloud database deployment (e.g., PlanetScale, Railway MySQL, or AWS RDS) will be considered in a later phase for 5 bonus marks.

**Build it right. Build it once.**
