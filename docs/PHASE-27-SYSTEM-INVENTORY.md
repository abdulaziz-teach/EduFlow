# Phase 27: Complete System Inventory

## 1. Executive Summary
This document provides a comprehensive inventory of the EduFlow platform codebase across the frontend user interface, backend application architecture, database persistence models, background workers, and external service integrations.

---

## 2. Frontend Inventory (React 18 + Vite + Tailwind CSS)

### A. Pages & Routes
- `/` — Landing / Onboarding Page (`src/pages/Onboarding.jsx`)
- `/dashboard` — Learner Dashboard with Streak, Tasks, Daily Coach (`src/pages/Dashboard.jsx`)
- `/courses` — Course Catalog & Learning Paths (`src/pages/Courses.jsx`)
- `/courses/:id` — Course Overview & Syllabus (`src/pages/CourseDetail.jsx`)
- `/courses/:courseId/lessons/:lessonId` — Lesson Workspace & Media Viewer (`src/pages/LessonView.jsx`)
- `/practice` — Quiz & Practice Mode (`src/pages/Practice.jsx`)
- `/practice/results` — Quiz Review & Analysis (`src/pages/PracticeResult.jsx`)
- `/flashcards` — Flashcards Decks & Spaced Repetition (SRS) (`src/pages/Flashcards.jsx`)
- `/flashcards/study/:id` — Active Flashcard Study Room (`src/pages/FlashcardStudy.jsx`)
- `/smart-notes` — AI-Powered Smart Study Notes (`src/pages/SmartNotes.jsx`)
- `/focus` — Gamified Focus Room with Timer & Rewards (`src/pages/FocusRoom.jsx`)
- `/leaderboard` — Global & Weekly Student Leaderboard (`src/pages/Leaderboard.jsx`)
- `/mentor` — AI Mentor 2.0 Socratic Study Assistant (`src/pages/Mentor.jsx`)
- `/search` — Multi-Entity Search & Intelligent Discovery (`src/pages/Search.jsx`)
- `/notifications` — Notification Center & Engagement Feed (`src/pages/Notifications.jsx`)
- `/billing` — Subscription Management, Invoices & Pricing (`src/pages/Billing.jsx`)
- `/admin` — Operations, Moderation, Incidents & Governance Hub (`src/pages/Admin.jsx`)
- `/profile` — Student Profile, Preferences & Timezone (`src/pages/Profile.jsx`)
- `/progress` — Longitudinal Learning Analytics (`src/pages/Progress.jsx`)
- `*` — 404 Not Found Page (`src/pages/NotFound.jsx`)

### B. Route Protections & Navigation
- `ProtectedRoute` (`src/components/ProtectedRoute.jsx`): Enforces authenticated JWT session.
- `Navbar` (`src/components/Navbar.jsx`): Responsive desktop and mobile navigation with active links, notification badges, and user profile drawer.
- `NotificationCenter` (`src/components/notifications/NotificationCenter.jsx`): Real-time bell popover with unread counters and in-app actions.

### C. API Client Architecture
- `src/services/api.js`: Unified HTTP client supporting JWT attachment, `AbortController` timeout protection (15s/30s), exponential backoff for idempotent `GET` requests, and offline status normalization.
- Dedicated service modules: `auth.js`, `admin.js`, `billing.js`, `search.js`, `notifications.js`, `mentor.js`, `learning.js`, `flashcardService.js`, `smartNoteService.js`, `leaderboardService.js`, `analytics.js`.

---

## 3. Backend Inventory (Node.js + Express 4)

### A. Routes & API Mount Points
- `/api/auth` ➔ `authRoutes.js` (Register, login, refresh, logout, session management)
- `/api/users` ➔ `userRoutes.js` (Profile, settings, learning preferences)
- `/api/courses` ➔ `courseRoutes.js` (Catalog, syllabus, enrollment, rating)
- `/api/study-plans` ➔ `studyPlanRoutes.js` (Personalized roadmap generation & tracking)
- `/api/mentor` ➔ `mentorRoutes.js` (AI Mentor 2.0 chat, conversation history, feedback)
- `/api/practice` ➔ `practiceRoutes.js` (Adaptive questions, session history, answer evaluation)
- `/api/quizzes` ➔ `quizRoutes.js` (Quiz taking, score grading, attempt logs)
- `/api/flashcards` ➔ `flashcardRoutes.js` (Decks, SRS Leitner-box review, flashcard progress)
- `/api/smart-notes` ➔ `smartNoteRoutes.js` (AI summary, flashcard extraction, note sync)
- `/api/leaderboard` ➔ `leaderboardRoutes.js` (All-time and weekly leaderboard rankings)
- `/api/wallet` ➔ `walletRoutes.js` (Coins, gems, transaction ledgers, rewards)
- `/api/shop` ➔ `shopRoutes.js` (Catalog items, atomic purchases, inventory)
- `/api/achievements` ➔ `achievementRoutes.js` (Badges, unlock criteria, reward granting)
- `/api/learning` ➔ `learningRoutes.js` (Adaptive paths, mastery radar, weakness detection)
- `/api/search` ➔ `searchRoutes.js` (Multi-entity search, autocomplete, analytics)
- `/api/billing` ➔ `billingRoutes.js` (Plans, Stripe/Mock checkout, webhooks, reconciliation)
- `/api/notifications` ➔ `notificationRoutes.js` (In-app feed, read status, preference management)
- `/api/admin` ➔ `adminRoutes.js` (User management, content workspace, moderation queue, flags, health, audit logs)
- `/api/reports` ➔ `reportRoutes.js` (Student content reporting and flagging)
- `/api/feature-flags` ➔ `featureFlagRoutes.js` (Client feature flag evaluation)
- `/health`, `/health/live`, `/health/ready`, `/health/db` ➔ Observability probes

### B. Middleware Pipeline
- `helmet`: Security HTTP headers
- `requestLogger`: Request ID correlation and structured logging
- `cookieParser`: Secure httpOnly refresh token handling
- `distributedRateLimit`: Multi-instance rate limiting backed by MongoDB
- `authMiddleware`: JWT extraction, verification, `requireRole`, `requirePermission`
- `entitlementMiddleware`: Server-side plan gating (`requireEntitlement`, `requireAIMessageQuota`)
- `errorMiddleware`: Production error sanitization (zero stack leaks)

### C. Background Schedulers & Schedulers
- `notificationSchedulerService.js`: Recurring sweeps for scheduled notifications, streak risk evaluation, daily plan check-ins, and flashcard SRS review prompts.
- `JobLock.js`: Distributed atomic lease coordinator ensuring at-most-once sweep execution across scaled backend replicas.

---

## 4. Database Inventory (MongoDB / Mongoose 8)

### Complete Model Catalog (49 Schemas)
1. **User & Identity**: `User.js`, `Session.js`, `LearnerProfile.js`, `NotificationPreference.js`
2. **Pedagogy & Curriculum**: `Course.js`, `Lesson.js`, `ContentVersion.js`, `KnowledgeTopic.js`, `KnowledgeEvent.js`
3. **Assessment & Practice**: `Quiz.js`, `QuizAttempt.js`, `PracticeQuestion.js`, `PracticeSession.js`
4. **Retention & Flashcards**: `FlashcardDeck.js`, `Flashcard.js`, `FlashcardProgress.js`
5. **Progress & Adaptive Learning**: `Enrollment.js`, `Progress.js`, `UserTopicMastery.js`, `MistakeLog.js`, `StudyPlan.js`, `PlanAdaptation.js`, `DailyLearningPlan.js`, `DailyCoachCache.js`, `StudySession.js`
6. **Gamification & Economy**: `Wallet.js`, `WalletTransaction.js`, `ShopItem.js`, `Inventory.js`, `Achievement.js`, `UserAchievement.js`, `LeaderboardEntry.js`
7. **AI & Mentor**: `Conversation.js`, `Message.js`, `AIFeedback.js`, `AIMemory.js`, `AIUsageLog.js`, `AIContentGeneration.js`, `AIConversation.js`, `AIMessage.js`
8. **Monetization & Billing**: `Subscription.js`, `Payment.js`, `WebhookEvent.js`
9. **Engagement & Communication**: `Notification.js`, `Report.js`
10. **Operations & Governance**: `AuditLog.js`, `FeatureFlag.js`, `Incident.js`, `SearchEvent.js`, `RateLimitBucket.js`, `JobLock.js`

### Storage Retention (TTL Indexes)
- `Session`: `{ expiresAt: 1 }` (Immediate eviction upon expiry)
- `RateLimitBucket`: `{ resetAt: 1 }` (Eviction on rate limit window reset)
- `SearchEvent`: `{ createdAt: 1 }` (90-day rolling window)
- `AIUsageLog`: `{ createdAt: 1 }` (180-day rolling window)

---

## 5. External Integrations & Circuit Breakers
1. **OpenAI Service**: Managed through `CircuitBreaker` (`openai-service`) with 15s timeout, sliding error counters, and automated cooldown.
2. **Stripe & Mock Payment Providers**: Server-authoritative plan catalog, HMAC webhook signature verification, and atomic idempotency ledger.
3. **MongoDB Replica Set**: Connection pool (`maxPoolSize: 50`), automated exponential backoff reconnection, and IPv4 DNS optimization.
