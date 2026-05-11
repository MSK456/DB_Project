# RideFlow — Implementation Log

> **University Project:** Database Systems Lab, Spring 2026
> **This log is maintained throughout the entire project and serves as the official technical report.**

---

## Phase 1: Project Scaffolding, Database Connection & Authentication System

---

### Phase 1.0 — Project Overview & Tech Stack

**Project Name:** RideFlow
**Purpose:** A ride-hailing platform inspired by Uber and Careem, built as a university Database Systems Lab project to demonstrate end-to-end database design, raw SQL interaction, and secure REST API development.

| Technology | Version | Purpose |
|---|---|---|
| Node.js | ≥18.x | JavaScript runtime |
| Express.js | ^5.2.1 | HTTP server & routing framework |
| MySQL | 8.x | Primary relational database |
| mysql2 | ^3.14.0 | Node.js MySQL driver (promise-based) |
| bcrypt | ^6.0.0 | Password hashing |
| jsonwebtoken | ^9.0.3 | JWT access & refresh token generation |
| Joi | ^17.13.3 | Request body schema validation |
| Cloudinary | ^2.8.0 | Cloud storage for profile photos |
| Multer | ^2.0.2 | Multipart file upload handling |
| helmet | ^8.0.0 | HTTP security headers |
| express-rate-limit | ^7.5.0 | Brute-force protection on auth routes |
| dotenv | ^17.2.3 | Environment variable management |
| nodemon | ^3.1.11 | Dev server auto-restart |
| prettier | ^3.7.4 | Code formatting |

**Architecture Overview:**

```
Client (React - Phase 3)
        │
        ▼
  Express.js Server (Node.js)
        │
        ├── Helmet (Security Headers)
        ├── CORS (Configured Origin Only)
        ├── Rate Limiter (Auth Routes)
        ├── Cookie Parser
        │
        ├── /api/v1/auth → Auth Router
        │       ├── validateBody (Joi)
        │       ├── verifyJWT (Protected Routes)
        │       └── Auth Controller
        │               └── User Model (Raw SQL)
        │
        └── MySQL Connection Pool (mysql2/promise)
                └── RideFlowDB (MySQL 8.x)
```

---

### Phase 1.1 — Project Structure & Scaffolding

**What was kept from the original project:**
- `app.js` — Express setup was clean; updated to add helmet, new router, and global error handler.
- `src/utils/ApiError.js` — Kept with minor JSDoc additions and a typo fix (`this.constructor`).
- `src/utils/ApiResponse.js` — Kept as-is with JSDoc.
- `src/utils/asyncHandler.js` — Kept as-is with JSDoc.
- `src/middlewares/multer.middleware.js` — Kept as-is with JSDoc.
- `.prettierrc`, `.prettierignore`, `.gitignore` — Kept unchanged.

**What was removed and why:**
- `mongoose`, `mongoose-aggregate-paginate-v2` — MongoDB/Mongoose has no place in a MySQL project. Replaced with `mysql2`.
- `src/utils/claudinary.js` — Renamed to `cloudinary.js` (typo fix). Env key corrected from `CLOUDINARY_CLAUD_NAME` → `CLOUDINARY_CLOUD_NAME`.
- `src/models/user.models.js` — Mongoose schema replaced with raw SQL functions in `user.model.js`.
- `src/controllers/user.controller.js` — Rewritten as `auth.controller.js` with MySQL logic.
- `src/routes/user.routes.js` — Replaced by `auth.routes.js` + `routes/index.js`.

**Dependencies Added:**
| Package | Reason |
|---|---|
| `mysql2` | MySQL driver with Promise API |
| `joi` | Schema validation (more expressive than express-validator) |
| `helmet` | Automatic HTTP security headers |
| `express-rate-limit` | Brute-force protection on auth endpoints |

**Dependencies Removed:**
| Package | Reason |
|---|---|
| `mongoose` | MongoDB ORM — not needed for MySQL |
| `mongoose-aggregate-paginate-v2` | MongoDB-specific pagination plugin |

---

### Phase 1.2 — MySQL Database Connection

**Connection Strategy: Connection Pool**

A **connection pool** (`mysql.createPool()`) was used instead of a single connection (`mysql.createConnection()`) for the following reasons:

1. **Concurrency** — Multiple simultaneous requests can each borrow a connection from the pool without waiting for each other.
2. **Performance** — Establishing a TCP connection to MySQL is expensive (~10-50ms). Pooling reuses existing connections instead of creating new ones per request.
3. **Reliability** — The pool automatically handles dropped connections and re-establishes them.
4. **Resource Control** — `DB_CONNECTION_LIMIT=10` caps the maximum concurrent DB connections, preventing DB overload.

**Why `mysql2/promise` instead of `mysql` or `mysql2` (callback)?**
- `mysql2` is the modern, faster replacement for the legacy `mysql` package.
- `mysql2/promise` wraps the callback-based API in Promises, enabling clean `async/await` usage.
- Supports prepared statements natively (critical for parameterized queries).

**Pool Configuration Parameters:**

| Parameter | Value | Purpose |
|---|---|---|
| `host` | `DB_HOST` env | MySQL server hostname |
| `port` | `DB_PORT` env (3306) | MySQL port |
| `user` | `DB_USER` env | Database user |
| `password` | `DB_PASSWORD` env | User password |
| `database` | `DB_NAME` env | Default schema |
| `connectionLimit` | `DB_CONNECTION_LIMIT` (10) | Max concurrent connections |
| `waitForConnections` | `true` | Queue requests instead of rejecting |
| `queueLimit` | `0` | Unlimited queue size |
| `enableKeepAlive` | `true` | Prevent idle connection drops |

**Fail-Fast Pattern:**
On startup, `connectDB()` calls `pool.getConnection()` to verify the DB is reachable. If it fails, `process.exit(1)` is called — the server never starts in a broken state.

---

### Phase 1.3 — Schema Modifications

Two columns were added to the existing `User` table:

```sql
ALTER TABLE User ADD COLUMN refresh_token TEXT DEFAULT NULL;
ALTER TABLE User ADD COLUMN profile_photo VARCHAR(255) DEFAULT NULL;
```

**`refresh_token` rationale:**
- Enables server-side token invalidation on logout (set to NULL).
- Prevents replay attacks — DB token must match the client's token.
- `TEXT` type used because JWTs can exceed `VARCHAR(255)` length.

**`profile_photo` rationale:**
- Stores the Cloudinary CDN URL for the user's profile photo.
- Nullable — profile photo is optional at registration.
- `VARCHAR(255)` is sufficient for a URL string.

---

### Phase 1.4 — User Model (Raw SQL Layer)

**Why no ORM?**
1. **DB Course Objective** — Demonstrates understanding of SQL at the query level.
2. **Grading Rubric** — Later phases require Aggregates, Joins, Views, Stored Procedures, Triggers, and Events — all demonstrated more clearly with raw SQL.
3. **Control** — Every query is explicit. No ORM generates unexpected or N+1 queries.
4. **Performance** — Direct queries have no ORM abstraction overhead.

**SQL Injection Prevention — Parameterized Queries:**
```js
// Safe — parameterized (mysql2 sends SQL and params separately to MySQL server)
pool.execute("SELECT * FROM User WHERE email = ?", [email]);

// NEVER done — string concatenation with user input
pool.execute(`SELECT * FROM User WHERE email = '${email}'`);
```

**All Query Functions:**

| Function | SQL | Purpose |
|---|---|---|
| `findUserByEmail(email)` | `SELECT * FROM User WHERE email = ?` | Duplicate check + login |
| `findUserByPhone(phone)` | `SELECT * FROM User WHERE phone = ?` | Duplicate check |
| `findUserById(userId)` | `SELECT * FROM User WHERE user_id = ?` | Auth middleware lookup |
| `findUserByRefreshToken(token)` | `SELECT * FROM User WHERE refresh_token = ?` | Token refresh/replay check |
| `findDriverByLicense(licenseNumber)` | `SELECT * FROM Driver WHERE license_number = ?` | Driver duplicate check |
| `findDriverByCnic(cnic)` | `SELECT * FROM Driver WHERE cnic = ?` | Driver duplicate check |
| `createUser(userData)` | `INSERT INTO User (...)` | User registration |
| `createDriverProfile(driverData)` | `INSERT INTO Driver (...)` | Driver-specific data |
| `createWallet(driverId)` | `INSERT INTO Wallet (driver_id, balance)` | Driver wallet creation |
| `updateRefreshToken(userId, token)` | `UPDATE User SET refresh_token = ?` | Store token on login |
| `clearRefreshToken(userId)` | `UPDATE User SET refresh_token = NULL` | Invalidate on logout |

---

### Phase 1.5 — Validation Layer (Joi)

**Why Joi over express-validator?**
- Fluent builder API — more readable and composable.
- Schema inheritance: `driverRegistrationSchema` extends `riderRegistrationSchema` via `.keys()`.
- `abortEarly: false` collects all errors in one pass.
- `allowUnknown + stripUnknown` sanitises extra fields before they reach controllers.

**Schemas:**

| Schema | Fields | Key Rules |
|---|---|---|
| `riderRegistrationSchema` | full_name, email, phone, password | min 8 chars, 1 uppercase, 1 digit, 1 special |
| `driverRegistrationSchema` | All Rider fields + license_number, cnic | CNIC regex: `XXXXX-XXXXXXX-X` |
| `loginSchema` | email, password | email format required |

**Dynamic Schema Selection:**
The single `/register` route uses a `validateRegistration` middleware that reads `req.body.role` and selects the correct schema at runtime — no duplicate routes needed.

---

### Phase 1.6 — Authentication System

**JWT Strategy: Access Token + Refresh Token**

| Token | Payload | Expiry | Storage |
|---|---|---|---|
| Access Token | `{ userId, email, role }` | 1 day | httpOnly cookie + response body |
| Refresh Token | `{ userId }` | 10 days | httpOnly cookie + database |

**Why Two Tokens?**
- Access token is short-lived — if stolen, it expires within 1 day.
- Refresh token is long-lived but stored server-side. Logout invalidates it by clearing the DB record — the attacker's refresh token becomes useless even before expiry.

**Why httpOnly Cookies over localStorage?**
- `localStorage` is readable by any JS on the page — XSS vulnerability.
- `httpOnly` cookies are browser-managed and cannot be read by client-side scripts.
- `sameSite: "strict"` prevents CSRF attacks.

**bcrypt saltRounds: 12**
| Rounds | Iterations | ~Time | Assessment |
|---|---|---|---|
| 10 | 1,024 | ~75ms | Minimum acceptable |
| 12 | 4,096 | ~250ms | Production standard ✅ |
| 15 | 32,768 | ~8s | Too slow for UX |

**Registration Flow (Rider):**
1. Extract role → default `Rider`, block `Admin` (403)
2. Run Joi schema validation
3. Check duplicate email → 409
4. Check duplicate phone → 409
5. Hash password (bcrypt, 12 rounds)
6. Upload profile photo to Cloudinary (optional)
7. INSERT into `User` → get `user_id`
8. Generate access + refresh tokens
9. Store refresh token in DB
10. Set httpOnly cookies → return 201 with sanitised user

**Registration Flow (Driver — additional steps):**
- After step 4: Check duplicate license_number → 409
- After step 4: Check duplicate CNIC → 409
- After step 7: INSERT into `Driver` (driver_id = user_id)
- After step 7: INSERT into `Wallet` (balance = 0)

**Login Flow:**
1. Find user by email → 404 if not found
2. Check account_status → 403 if Banned/Suspended
3. `bcrypt.compare(password, password_hash)` → 401 if wrong
4. Generate new access + refresh tokens
5. Update refresh token in DB
6. Set cookies → return 200 with user data

**Logout Flow:**
1. `verifyJWT` confirms user is authenticated
2. `clearRefreshToken(userId)` → DB: `refresh_token = NULL`
3. `clearCookie()` removes both cookies from client
4. Return 200

**Token Refresh Flow:**
1. Extract refresh token from cookie or body
2. `verifyRefreshToken()` — throws 401 if invalid/expired
3. `findUserByRefreshToken()` — 401 if no DB match (replay attack blocked)
4. Generate new access token + rotate refresh token
5. Update DB with rotated refresh token
6. Set new cookies → return 200

---

### Phase 1.7 — Middleware Architecture

**`verifyJWT`:**
- Reads token from `req.cookies.accessToken` OR `Authorization: Bearer <token>` (supports browser + Postman/mobile clients).
- `verifyAccessToken()` validates signature and expiry — throws 401 on failure.
- Fetches user from DB to get current `account_status` (JWT alone can't reflect real-time bans).
- Blocks Banned/Suspended accounts with 403.
- Attaches `req.user = { userId, email, role, full_name, account_status }`.

**`authorizeRoles(...roles)` — Factory Pattern:**
- `authorizeRoles("Admin", "Driver")` returns a middleware closure.
- Checks `req.user.role` against the provided list — throws 403 if not permitted.
- Must be chained after `verifyJWT`.

**`validateBody(schema)` — Factory Pattern:**
- Takes a Joi schema → returns middleware.
- `abortEarly: false` collects all validation errors.
- `allowUnknown + stripUnknown` sanitises extra fields.
- Throws `ApiError(400, "Validation Error", errorsArray)` on failure.

---

### Phase 1.8 — Security Measures

**`helmet`:** Sets ~15 security headers including `X-Content-Type-Options`, `X-Frame-Options`, `HSTS`, `Content-Security-Policy`.

**`express-rate-limit`:** Max 10 requests per 15 minutes per IP on `/register` and `/login`. Returns HTTP 429 on violation.

**CORS:** Only the configured `CORS_ORIGIN` is allowed. `credentials: true` enables cookie passing.

**Cookie Flags:**
| Flag | Purpose |
|---|---|
| `httpOnly: true` | Inaccessible to client-side JS — prevents XSS token theft |
| `secure: true (prod)` | HTTPS only — prevents interception |
| `sameSite: "strict"` | Not sent on cross-site requests — prevents CSRF |

**SQL Injection:** All queries use `?` parameterized placeholders via mysql2.

**Password Hashing:** bcrypt with 12 rounds. `password_hash` never returned in responses.

**Response Sanitisation:** `sanitiseUser()` helper strips `password_hash` and `refresh_token` from all API responses.

---

### Phase 1.9 — API Endpoints Reference

| Method | Endpoint | Auth Required | Role | Description |
|--------|----------|---------------|------|-------------|
| POST | `/api/v1/auth/register` | No | Rider / Driver | Register new user |
| POST | `/api/v1/auth/login` | No | Any | Login |
| POST | `/api/v1/auth/logout` | Yes | Any | Logout |
| POST | `/api/v1/auth/refresh-token` | No | Any | Get new access token |
| GET | `/api/v1/auth/me` | Yes | Any | Get current user |
| GET | `/health` | No | — | Health check |

---

### Phase 1.10 — Known Limitations & Future Work

**Not implemented in Phase 1 (by design):**
- Ride management, payment processing, rating system
- Admin dashboard and user management
- Driver verification workflow, vehicle registration
- Promo code management, real-time tracking (Socket.io)
- Email verification, password reset flow

---

## Phase 2: Driver Availability, Vehicle Management, Ride Lifecycle & DB Objects

---

### Phase 2.0 — Schema Modifications & DB Objects

Implemented complex database logic using raw SQL objects to ensure business integrity and performance.

**Objects Implemented:**
- **Views:** `ActiveRidesView` (live tracking), `TopDriversView` (performance monitoring).
- **Stored Procedures:** `CalculateFare` (centralized pricing logic with surge support).
- **Triggers:** `after_ride_status_change` (auto-archiving + trip counting), `after_rating_inserted` (auto-recalculating avg ratings + flagging low performers).
- **Events:** `expire_promo_codes` (nightly cleanup of inactive promotions).
- **Indexes:** Multi-column and single-column indexes on high-traffic lookup fields (`current_city`, `status`, `driver_id`).

---

### Phase 2.1 — Driver Availability & Profiles
Drivers can now manage their online status and view detailed stats.
- **Guard Logic:** Drivers must be `Verified` and have at least one `Verified` vehicle to go `Online`.
- **Stats:** Aggregated trip counts, average ratings, and monthly earnings using SQL `SUM` and `COUNT` functions.

---

### Phase 2.2 — Vehicle Management
Decoupled vehicle registration from user registration.
- **Verification Workflow:** Admins must manually verify vehicles before they can be used for rides.
- **Logic:** Unique license plate enforcement and strict year/make/model validation.

---

### Phase 2.3 — Ride Lifecycle (The Matching Engine)
Implemented a sophisticated matching system using complex SQL JOINs.
- **Matching Query:** Filters by `Online` status, `Verified` driver/vehicle, `Active` account, `vehicle_type`, and `current_city`. Orders by `avg_rating DESC` to ensure quality.
- **State Machine:** `Accepted` → `Driver En Route` → `In Progress` → `Completed`.
- **Fare Calculation:** Triggered on trip completion via `CalculateFare` stored procedure.

---

### Phase 2.4 — Admin Reporting (SQL Aggregates)
Implemented dedicated endpoints for mandatory lab reports:
- **Revenue:** `SUM(fare)` grouped by city.
- **Trip Counts:** `COUNT(ride_id)` per driver.
- **Quality Control:** `HAVING avg_rating < 3.5` for low-rated driver reports.

---

### Phase 2.5 — API Endpoints Reference (New)

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| PATCH | `/api/v1/driver/availability` | Driver | Toggle Online/Offline |
| GET | `/api/v1/driver/profile` | Driver | Fetch full profile with vehicles |
| POST | `/api/v1/vehicles` | Driver | Register new vehicle (Pending) |
| POST | `/api/v1/rides/request` | Rider | Request a ride (Matches Driver) |
| PATCH | `/api/v1/rides/:id/start` | Driver | Start the trip |
| PATCH | `/api/v1/rides/:id/complete` | Driver | End trip + Calculate fare |
| PATCH | `/api/v1/admin/vehicles/:id/verify` | Admin | Verify/Reject vehicle |
| GET | `/api/v1/admin/reports/revenue` | Admin | City-wise revenue report |

---
---

## Phase 3: Payment Processing, Wallet System, Promo Codes & Financial Reports

---

### Phase 3.0 — Phase Overview & Financial Architecture
Phase 3 completes the backend by implementing the entire financial layer. The core objective was to ensure data integrity and atomicity for all money movements (ACID properties) while satisfying the lab requirements for complex joins and aggregate queries.

**Key Architecture Decisions:**
- **Dual Wallets:** Separate tables for `Rider_Wallet` and `Driver` wallets to allow role-specific logic and symmetric balance tracking.
- **Audit Ledger:** Every movement of money is recorded in `Wallet_Transaction`. The balance is never updated without a corresponding ledger entry.
- **Atomic Transactions:** No financial logic runs as a single query; everything is wrapped in `START TRANSACTION ... COMMIT` to prevent partial data states.

---

### Phase 3.1 — Promo Code System
Implemented a robust promo system that allows admins to manage discounts and riders to apply them.
- **Validation Engine:** A shared utility (`promoUtils.js`) enforces 6 layers of checks: existence, activation status, expiry date, usage limits, minimum ride amount, and discount calculation.
- **Trigger-Based Usage Tracking:** An `AFTER UPDATE` trigger on the `Payment` table automatically increments `usage_count` when a payment is marked as `Paid`, ensuring the DB handles usage logic internally.

---

### Phase 3.2 — Payment Processing (The ACID Core)
The most critical part of the system is the atomic payment flow. This demonstrates the **Atomicity** and **Consistency** of the database.

**Transaction Flow:**
1. **Debit Rider:** Subtracts the final amount from `Rider_Wallet`.
2. **Credit Driver:** Adds the base fare minus platform commission to the driver's wallet.
3. **Log Transactions:** Creates two rows in `Wallet_Transaction` (debit for rider, credit for driver).
4. **Update Payment:** Sets `payment_status = 'Paid'` and stores final amounts/promos used.
5. **Rollback:** If any step fails (e.g., DB crash mid-way), the `catch` block rolls back the entire sequence so no money is lost or gained incorrectly.

---

### Phase 3.3 — Wallet Management & Payouts
Drivers can view their earnings and request payouts.
- **Payout Workflow:** Payouts are not automatic. Drivers submit a request (`Pending`). Admins must `Approve` it, which triggers a secondary transaction to deduct from the driver's wallet and mark the request as `Processed`.
- **Top-Up:** Riders can simulate adding funds to their wallet to test payment flows.

---

### Phase 3.4 — Financial Report Endpoints (SQL Aggregates)
Implemented 7 specialized reports using advanced SQL features to satisfy the grading rubric:
- **GROUP BY + SUM/AVG:** Revenue by city and payment method.
- **Complex JOINs:** Driver earnings report joining `Driver`, `User`, `Ride`, `Payment`, and `Wallet_Transaction`.
- **HAVING Clause:** Filtering low-rated drivers based on aggregated rating scores.
- **LEFT JOIN Audit:** `reportAllRiders` uses a `LEFT JOIN` to ensure riders with 0 rides are still included in the user audit, preventing data omission.

---

### Phase 3.5 — API Endpoints Reference (New)

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/promos` | Admin | Create new promo code |
| POST | `/api/v1/promos/validate` | Rider | Preview discount for a ride |
| POST | `/api/v1/payments/pay` | Rider | Process ride payment (Atomic) |
| POST | `/api/v1/wallet/topup` | Rider | Add money to rider wallet |
| POST | `/api/v1/wallet/payout` | Driver | Request earnings withdrawal |
| PATCH | `/api/v1/admin/payouts/:id/process` | Admin | Approve/Reject payout |
| GET | `/api/v1/admin/reports/revenue/by-city` | Admin | Aggregate revenue report |
| GET | `/api/v1/admin/reports/riders/all` | Admin | Full rider audit (LEFT JOIN) |

---
*(End of Backend Implementation Phases)*

## Phase 5.1 — Ratings & Reviews System
- **One rating per side per ride**: Implemented database unique constraint `unique_rating_per_ride_per_side` and backend checks.
- **Mutual Rating Flow**: Enabled riders to rate drivers and drivers to rate riders.
- **Payment Gate**: Enforced logic that riders cannot rate a trip until the payment status is 'Paid'.
- **Automated Recalculation**: The `after_rating_inserted` trigger automatically updates the driver's average rating in the `driver` table and flags them if it drops below 3.5.
- **Rating Breakdown**: Added support for star distribution (5-star, 4-star, etc.) in the `getMyRatings` endpoint for profile analysis.
- **Rating Status Tracking**: Added `rider_has_rated` and `driver_has_rated` flags to the `ride` table for UI state management.

## Phase 5.3 — DCL: Database Role-Based Access Control
Implemented MySQL Data Control Language (DCL) to enforce the principle of least privilege. This ensures data security by restricting access to sensitive tables based on user roles.

- **MySQL Roles vs. Users**: Roles (`rideflow_rider_role`, etc.) define permission templates, while users (`rf_rider_user`, etc.) are individual accounts assigned to these roles.
- **App Connection Separation**: The main application connects with a privileged user, while these DCL roles are created for database-level auditing and reporting.
- **Access Hierarchy**:
    - **Riders**: SELECT/INSERT on rides and payments; SELECT on drivers/vehicles.
    - **Drivers**: SELECT/UPDATE on assigned rides; SELECT on user profiles.
    - **Support**: Global SELECT access; explicitly REVOKED DELETE on core tables (Ride, Payment, User).
    - **Admin**: FULL PRIVILEGES on the entire schema.
- **Rubric Compliance**: Verified that specific `GRANT` and `REVOKE` statements map directly to project requirements for role-based security.
- **Audit Users**: Created four dedicated MySQL users with default roles assigned for verification.
