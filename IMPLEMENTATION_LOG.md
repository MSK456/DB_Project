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

**Planned for Phase 2:**
- Ride request/acceptance flow, fare calculation
- Admin routes (user management, driver verification)
- SQL Aggregates (avg ratings, revenue reports)
- SQL JOINs (ride history with user and driver details)
- Database Views, Stored Procedures, Triggers, Events
- DCL: GRANT/REVOKE for role-based DB permissions
- Cloud DB deployment (PlanetScale/Railway) for bonus marks

---
*(Future phases will be added below as Phase 2, Phase 2.1, etc.)*
