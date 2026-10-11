# AgentBlazer Club — Website

The official website and admin panel for **AgentBlazer Club**, SJEC — built during the live build phase of the club's **Build Blazer** event.

## Team

| Role | Name |
|---|---|
| Team Lead | Nidhi U Kulal |
| Members | Rikisha Shetty |
| Members | Sanika S |
| Members | Nisha |

## 🔗 Links

**Live Site:**  
_Add your Vercel frontend URL here after deploying_

**Admin Panel:**  
_Your frontend URL_`/admin/login`


## About

This project was built as **Phase 2** of AgentBlazer Club's Build Blazer event — where the winning Figma design from Phase 1 was implemented as a live, deployed, full-stack website.


## Features


- **Responsive Public Website** — Landing page, About, Events & Workshops, Team, Leadership, and Join & Connect sections with a modern theme-aware design.

- **Membership & Contact Forms** — College-email OTP verification for secure membership applications and contact inquiries, with automatic confirmation emails.

- **Admin Dashboard** — Secure JWT-based admin login with management screens for Events, Team Members, Leadership, and Site Settings.

- **Event & Team Management** — Admins can create, edit, and delete events, event galleries, team members, leadership entries, and other website content dynamically.

- **Recruitment Pipeline** — Two-stage Aptitude → Interview evaluation system with Select/Reject actions, status tracking, and applicant filtering.

- **Automated Email System** — SMTP/Nodemailer integration for OTP verification, application confirmations, and automatic round-result notifications with email delivery tracking and resend support.

- **Secure Backend & API** — RESTful Express API with rate limiting, input sanitization, CORS protection, authentication, and MongoDB-based data management.

## Tech Stack

| Layer      | Technology                                   |
|------------|-----------------------------------------------|
| Frontend   | React 18, Vite                                |
| Backend    | Node.js, Express                              |
| Database   | MongoDB (Mongoose)                            |
| Auth       | JWT-based admin sessions                      |
| Email      | Nodemailer (SMTP)                             |
| Deployment | Vercel (frontend + backend)                   |

## Project Structure

```
Agentblazer-buildblazer/
├── backend/              # Express API
│   ├── config/           # Database connection
│   ├── middleware/       # Auth, rate limiting, sanitization
│   ├── models/           # Mongoose schemas
│   ├── routes/           # API route handlers
│   ├── scripts/          # One-off admin/maintenance scripts
│   ├── utils/            # Email, OTP, recruitment helpers
│   └── server.js         # App entry point
├── frontend/             # React (Vite) app
│   └── src/
│       ├── admin/        # Admin panel (login, layout, pages)
│       ├── assets/       # Images and media
│       ├── App.jsx       # Public site
│       └── api.js        # Public API client
├── package.json          # Root scripts (runs both apps together)
└── README.md
```

## Getting Started Locally

### Prerequisites

- Node.js 18+
- A MongoDB connection string (e.g. MongoDB Atlas)
- SMTP credentials for outgoing email (e.g. a Gmail app password)

### 1. Clone the repository

```bash
git clone https://github.com/YOUR-USERNAME/YOUR-REPO.git
cd YOUR-REPO
```

### 2. Configure environment variables

**Backend** — copy `backend/.env.example` to `backend/.env` and fill in:

```env
PORT=5000
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/agentblazer
JWT_SECRET=replace_with_a_long_random_secret
FRONTEND_URL=http://localhost:5173
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change_this_password

# SMTP (used for OTP, contact form and recruitment result emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_club_email@gmail.com
SMTP_PASS=your_app_password
```

**Frontend** — copy `frontend/.env.example` to `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Install dependencies and run

```bash
npm run install:all     # installs root, backend, and frontend dependencies
npm run create-admin    # one-time: creates the admin login
npm run dev              # runs backend (port 5000) and frontend (port 5173) together
```

- Site: [http://localhost:5173](http://localhost:5173)
- Admin panel: [http://localhost:5173/admin/login](http://localhost:5173/admin/login)

### Available root scripts

| Script                  | Description                                      |
|--------------------------|---------------------------------------------------|
| `npm run install:all`     | Installs dependencies for root, backend, frontend |
| `npm run dev`               | Runs backend + frontend concurrently               |
| `npm run dev:backend`        | Runs only the backend (with nodemon)                 |
| `npm run dev:frontend`        | Runs only the frontend (Vite dev server)               |
| `npm run create-admin`         | Creates the initial admin account                        |
| `npm run build`                  | Builds the frontend for production                          |

## API Overview

Base URL: `/api`

| Route          | Purpose                                              |
|-----------------|--------------------------------------------------------|
| `/auth`          | Admin login                                              |
| `/members`        | Membership applications — submit, OTP verify, evaluate, bulk-delete |
| `/events`           | Club events (CRUD)                                          |
| `/team`               | Team members (CRUD)                                            |
| `/leadership`            | Leadership members (CRUD)                                         |
| `/settings`                | Site-wide settings                                                   |
| `/stats`                     | Admin dashboard stats                                                   |
| `/contact`                     | Contact form submissions                                                  |

All admin-only routes require a `Bearer` JWT obtained from `/api/auth/login`.

## Deployment

Both the frontend and backend are deployed on **Vercel**, connected to this GitHub repository. Every push to the main branch triggers an automatic redeploy.

Environment variables (`MONGODB_URI`, `JWT_SECRET`, `SMTP_*`, `VITE_API_URL`, etc.) are configured in the respective Vercel project's **Settings → Environment Variables**, mirroring the `.env.example` files above.

## Notes

- Admin sessions are kept in memory only (not `localStorage`) — refreshing always requires logging in again.
- Applicants receive an automatic confirmation email on submission, and another at each recruitment round decision.
- Interview-round evaluation only unlocks once an applicant has cleared the aptitude round.

---

Built by the **Tech Titans** during AgentBlazer Club's **Build Blazer** event, SJEC.
In collaboration with **Cipher (CSE Association)**.