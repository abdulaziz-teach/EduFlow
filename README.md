# EduFlow — AI-Powered Personal Study Assistant

EduFlow is an intelligent, modern study companion designed to help students organize learning, practice what they are studying, detect topics needing review, and get personalized step-by-step guidance.

---

## 🌟 Core Features

- **Authentication & Onboarding**: Secure JWT-based registration, profile setup, and customizable learning preferences.
- **Personalized AI Study Plans**: Dynamic, daily-scheduled roadmaps adapted to user exam dates, available daily minutes, and subject priorities.
- **Adaptive Study Engine**: Automatic detection of overdue items with non-destructive, capacity-aware schedule rebalancing.
- **Smart Practice & AI Quiz Engine**: Adaptive practice generator offering multiple-choice, true/false, and short-answer questions with instant feedback and answer security.
- **Knowledge Tracking & Heuristic Map**: Heuristic-based understanding metrics (New, Learning, Needs Review, Strong) with spaced repetition review triggers.
- **Interactive AI Mentor**: Socratic study assistant that explains difficult concepts, breaks down problems, and references user goals.
- **Daily Learning Coach**: Proactive daily motivational guidance and priority task recommendations.
- **Progress Analytics & Streaks**: Comprehensive statistics tracking study time, task completion, practice accuracy, and consecutive day streaks.
- **Notification Center & Preferences**: Granular notifications for task reminders, streak milestones, achievement unlocks, and review alerts.

---

## 🏗️ Architecture & Tech Stack

### Frontend
- **Framework**: React 18 with Vite
- **Routing**: React Router DOM (v6) with lazy-loaded route splitting
- **Styling**: Tailwind CSS & Lucide Icons
- **Resilience**: Global React ErrorBoundary & responsive UI for mobile, tablet, and desktop

### Backend
- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Security**: Helmet security headers, CORS origin whitelisting, bcryptjs password hashing, JWT authentication, and Express Rate Limiting
- **AI Integration**: OpenAI SDK with server-side validation and fallback resilience

---

## 📁 Project Structure

```text
EduFlow/
├── .env.example               # Frontend environment template
├── package.json               # Frontend dependencies and build scripts
├── vite.config.js             # Vite configuration
├── src/
│   ├── components/            # Reusable UI components & ErrorBoundary
│   │   ├── achievements/      # Achievement badges & showcases
│   │   ├── knowledge/         # Knowledge map & review cards
│   │   ├── landing/           # Landing page sections
│   │   ├── notifications/     # Notification drawer & badge
│   │   ├── practice/          # Quiz player, progress, and history
│   │   ├── study-plan/        # Plan views & adaptation modal
│   │   └── ui/                # Button, modal, loading screens
│   ├── context/               # AuthContext & global state
│   ├── layouts/               # MainLayout with responsive navbar & footer
│   ├── pages/                 # Dashboard, StudyPlan, Mentor, Practice, Progress, etc.
│   └── services/              # Client API connectors
│
└── backend/
    ├── .env.example           # Backend environment template
    ├── package.json           # Backend dependencies and test scripts
    ├── src/
    │   ├── app.js             # Express app setup, security & middleware
    │   ├── server.js          # DB connection & server initialization
    │   ├── config/            # Database configuration
    │   ├── controllers/       # Route controllers (Auth, Study, Practice, Knowledge, etc.)
    │   ├── middleware/        # JWT auth, input validation, centralized error handler
    │   ├── models/            # Mongoose schemas with compound indexes
    │   ├── routes/            # Express route definitions
    │   ├── seed/              # Demo account seeder
    │   └── services/          # Business logic, AI engine, heuristics, notifications
    └── tests/
        └── api.test.js        # Automated integration test suite
```

---

## ⚙️ Environment Variables

### Backend Configuration (`backend/.env`)

Create `backend/.env` based on `backend/.env.example`:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/eduflow
JWT_SECRET=your_super_secret_jwt_key_here
CLIENT_URL=http://localhost:5173
AI_API_KEY=your_openai_api_key_here
AI_MODEL=gpt-4o-mini
```

### Frontend Configuration (`.env`)

Create `.env` in the project root:

```env
VITE_API_URL=http://localhost:5000/api
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18 or higher)
- MongoDB running locally or a MongoDB Atlas URI

### 2. Backend Setup
```bash
cd backend
npm install
npm run start
```
*The backend API will start on `http://localhost:5000`.*

### 3. Frontend Setup
```bash
# In project root
npm install
npm run dev
```
*The frontend client will open on `http://localhost:5173`.*

---

## 🧪 Testing & Verification

### Running Automated Test Suite
```bash
# Run 38 Integration Tests from root:
npm test

# Run 19 Adversarial Security Tests from root:
npm run test:adversarial

# Run All Tests combined:
npm run test:all
```
*Executes the 57 comprehensive automated test cases covering authentication, authorization, IDOR isolation, quiz engine atomic locks, knowledge tracking, AI timeouts, and adversarial penetration vectors.*

### Running Frontend Build
```bash
npm run build
```

---

## 💼 Investor Demo Mode & Seeding

To quickly populate a rich, fully populated demo account for presentations:

```bash
cd backend
npm run seed:demo
```

### Demo Credentials
- **Email**: `demo@eduflow.app`
- **Password**: `DemoPassword123!`

### Demo Highlights
1. **Dashboard**: Daily greeting, active streak, daily coach recommendation, today's schedule.
2. **Study Plan**: 14-day interactive plan with past completed tasks and upcoming revisions.
3. **Practice**: Cached questions across CS and Mathematics with instant feedback.
4. **Knowledge Map**: Visual mastery levels (Strong, Needs Review, Learning) with review triggers.
5. **AI Mentor**: Context-aware educational assistant with previous chat history.
6. **Notifications & Achievements**: Badges unlocked and realistic digest reminders.

---

## 🔒 Security & Reliability Measures

- **No Secret Leaks**: All AI API keys and JWT signing secrets remain server-side.
- **Answer Security**: Practice questions never expose `correctAnswer` or `explanation` in initial payloads.
- **Resource Ownership**: All user documents are strictly scoped to the authenticated `req.user._id`.
- **Centralized Error Handling**: Sanitized 500 error messages in production with zero leaked stack traces or DB internals.
- **MongoDB Hardening**: Mass assignment whitelisting and structured query parameters prevent NoSQL injection.
- **Rate Limiting**: Auth endpoints and AI generators are protected against brute-force and high-frequency abuse.
- **UI Error Boundary**: Prevents blank screens during unexpected rendering faults with intuitive recovery.

---

## 📄 License
MIT License. Built for students and lifelong learners.
