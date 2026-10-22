# EduFlow — Production-Ready Educational Platform & MongoDB Database Architecture

EduFlow is an intelligent, modern educational study companion and learning management platform. It combines adaptive study plans, spaced repetition flashcards, course delivery, secure quizzes, virtual currency economies, and AI mentoring into a scalable, production-hardened MongoDB backend.

---

## 🌟 Complete Architecture & Capabilities

### Core Modules & Collections (21 Collections)
1. **users**: User profiles, normalized emails, secure password hashes, roles (`user`, `admin`), account statuses (`active`, `suspended`, `deleted`), and soft-delete (`deletedAt`).
2. **sessions**: Hashed refresh tokens (`tokenHash`), TTL indexes on `expiresAt`, client context tracking (`userAgent`, `ipHash`), and token rotation with reuse detection.
3. **courses**: Catalog of courses with unique slugs, categories, levels, instructor references, statuses (`draft`, `published`, `archived`), and soft-delete.
4. **lessons**: Ordered lessons belonging to a single course with compound unique constraints (`courseId + order`, `courseId + slug`).
5. **enrollments**: User course registrations with compound unique index (`userId + courseId`) preventing duplicate active enrollments.
6. **progress**: Atomic lesson progress with compound unique index (`userId + lessonId`), watch time, and completion tracking.
7. **quizzes**: Embedded question sets with passing scores and DTO serializers stripping `correctAnswer` and `explanation` from student payloads.
8. **quizAttempts**: Server-calculated scores, percentages, and pass/fail states with verified answer evaluations.
9. **flashcards**: Normalized flashcards belonging to decks with hints and difficulties.
10. **flashcardProgress**: Server-side SuperMemo-2 (SM-2) spaced repetition engine calculating `easeFactor`, `interval`, `repetitions`, and `dueAt`.
11. **achievements**: Configurable system achievements with conditions and virtual currency rewards.
12. **userAchievements**: Unlocked achievement records with compound unique index (`userId + achievementId`) and atomic reward granting.
13. **leaderboardEntries**: Pre-aggregated, indexed rankings across time periods (`daily`, `weekly`, `monthly`, `allTime`) optimized for low memory usage.
14. **wallets**: User balance accounts storing virtual currencies (`coins`, `gems`, `tickets`) with non-negative constraints.
15. **walletTransactions**: Auditable ledger tracking all balance modifications (`earn`, `spend`, `refund`, `purchase`, `reward`) with idempotency keys.
16. **shopItems**: Virtual items with currency types, active statuses, and stock tracking.
17. **inventories**: User items with compound unique index (`userId + itemId`) and quantity tracking.
18. **notifications**: Cursor-paginated notification center with compound index (`userId + read + createdAt`).
19. **aiConversations**: AI Mentor conversation threads.
20. **aiMessages**: Chronologically ordered messages in conversation threads with role enforcement (`user`, `assistant`, `system`).
21. **auditLogs**: Tamper-evident admin action audit trails (`adminUserId`, `action`, `targetType`, `targetId`, `metadata`).

---

## 🏛️ Entity Relationship Diagram

```text
USER
 │
 ├── Session (hashed refresh tokens, TTL, ipHash, userAgent)
 │
 ├── Enrollment ─────────────── Course
 │                                │
 │                                └── Lesson
 │                                     │
 │                                     ├── Quiz
 │                                     │    └── QuizAttempt (server-calculated)
 │                                     │
 │                                     └── Flashcard
 │                                          └── FlashcardProgress (server SM-2)
 │
 ├── Progress (watchTime, position, completion)
 │
 ├── Wallet (coins, gems, tickets, atomic updates)
 │    └── WalletTransaction (idempotent, audit trail)
 │
 ├── Inventory ─────────────── ShopItem (active, stock, price, currency)
 │
 ├── UserAchievement ───────── Achievement (conditionType, conditionValue, reward)
 │
 ├── LeaderboardEntry (daily, weekly, monthly, allTime)
 │
 ├── Notification (cursor paginated, readAt)
 │
 ├── AIConversation
 │    └── AIMessage (paginated, role: user|assistant|system)
 │
 └── AuditLog (admin actions, target, sanitized metadata)
```

---

## ⚙️ Environment Configuration

### Backend Environment Variables (`backend/.env`)

```env
# Server Port
PORT=5000

# Environment Mode (development | production | test)
NODE_ENV=development

# MongoDB Atlas Production Connection URI
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/eduflow?retryWrites=true&w=majority
MONGODB_DB_NAME=eduflow

# Connection Pool Settings
MONGODB_MAX_POOL_SIZE=50
MONGODB_MIN_POOL_SIZE=5

# High-Entropy JWT Secrets (min 32 characters, e.g. `openssl rand -hex 32`)
JWT_ACCESS_SECRET=your_production_high_entropy_access_secret_min_32_characters_here
JWT_REFRESH_SECRET=your_production_high_entropy_refresh_secret_min_32_characters_here

# Allowed Frontend Client Origin(s) (comma-separated)
CLIENT_URL=http://localhost:5173,http://localhost:5174

# OpenAI API Key (server-side only)
AI_API_KEY=sk-your-openai-api-key-here
AI_MODEL=gpt-4o-mini
```

*(Note: Legacy variable names `MONGO_URI` and `JWT_SECRET` are also supported as automated fallbacks).*

---

## 🚀 Installation & Local Database Setup

### 1. Prerequisites
- **Node.js**: v18+ or v20+
- **MongoDB**: Local MongoDB instance (`mongodb://localhost:27017/eduflow`) or MongoDB Atlas cluster.

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB Atlas or local URI
```

### 3. Frontend Setup
```bash
# In project root
npm install
npm run dev
```

---

## 💾 Seed & Migration Commands

### Seed Production Development Data
Generates admin and student accounts, courses, lessons, quizzes, flashcards, achievements, and shop items idempotently:
```bash
cd backend
npm run seed:production
```

**Seeded Test Credentials**:
- **Admin**: `admin@eduflow.test` / `Password123!` (Role: `admin`)
- **Student**: `student@eduflow.test` / `Password123!` (Role: `user`)

### Data Migration
Non-destructive backfill for existing production records (provisions missing wallets and user display names):
```bash
cd backend
npm run migrate
```

---

## 🧪 Testing & Verification

The test suite runs against the native Node.js test runner (`node --test`):

```bash
cd backend

# Run the complete test suite (88 automated integration tests):
npm run test:all

# Run standard API integration tests (38 tests):
npm test

# Run adversarial penetration & security tests (19 tests):
npm run test:adversarial

# Run production MongoDB architecture test suite (31 tests):
npm run test:production
```

### Frontend Build
```bash
npm run build
```

---

## 🔒 Security Hardening & Concurrency Architecture

1. **Answer Leakage Prevention**: Student quiz payloads strictly omit `correctAnswer` and `explanation`. Scores, percentages, and passing statuses are evaluated entirely on the server.
2. **Atomic Multi-Document Transactions**: Shop purchases, achievement unlocks, and balance transfers execute inside MongoDB transactions with automated standalone fallback and compensation logic.
3. **Race Condition Prevention**: Spending and economy operations use atomic preconditions (`$inc: { [currency]: -amount }` with `{ [currency]: { $gte: amount } }`). Balances can never fall below zero under concurrent load.
4. **Idempotency Protection**: Sensitive financial operations support unique idempotency keys (`idempotencyKey`), preventing double-charging on network retries.
5. **Session Management & Refresh Rotation**: Refresh tokens are stored as SHA-256 hashes in MongoDB and transmitted exclusively via `httpOnly`, `secure`, `SameSite` cookies. Token reuse triggers immediate revocation across all user sessions.
6. **Server-Side RBAC**: Admin-only routes (`POST /api/courses`, `POST /api/quizzes`, `POST /api/shop/items`, `POST /api/wallet/adjust`) are protected by `requireRole('admin')` middleware.
7. **Health Monitoring**: `GET /health` and `GET /health/db` provide granular operational metrics without exposing sensitive connection strings or database credentials.

---

## 📄 License
MIT License. Built for scalable, production-grade educational technology.
