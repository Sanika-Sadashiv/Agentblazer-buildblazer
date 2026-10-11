# AgentBlazer Club Backend

Backend API for the AgentBlazer Club website shown in the provided designs.

## Stack

- Node.js
- Express
- MongoDB
- Mongoose
- JWT authentication
- bcryptjs
- CORS
- dotenv

## Features

### Website content
- Events & workshops
- Team / student core team
- Faculty and leadership data
- Gallery
- Membership applications
- Contact messages
- Site statistics

### Theme system
The website has three theme choices:

- `violet` — ⚡ Violet
- `inferno` — 🔥 Inferno
- `frost` — ❄️ Frost

The backend provides:

`GET /api/settings/themes`

and:

`GET /api/settings`

Admin can change the site's default theme using:

`PUT /api/settings/theme`

with:

```json
{
  "theme": "inferno"
}
```

Important: for the three buttons at the top-right, the frontend should normally save the visitor's own choice in `localStorage`. That prevents one visitor from changing the theme for every other visitor. The backend theme setting is intended for the site's default/admin-controlled theme.

## API

### Public

- `GET /api/health`
- `GET /api/events`
- `GET /api/events/:id`
- `GET /api/team`
- `GET /api/gallery`
- `POST /api/members`
- `POST /api/contact`
- `GET /api/settings/themes`
- `GET /api/settings`
- `GET /api/stats`

### Admin

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/events`
- `PUT /api/events/:id`
- `DELETE /api/events/:id`
- `POST /api/team`
- `PUT /api/team/:id`
- `DELETE /api/team/:id`
- `POST /api/gallery`
- `DELETE /api/gallery/:id`
- `GET /api/members`
- `PUT /api/members/:id/evaluate` — record an aptitude/interview result `{ round, result, note? }`; emails the applicant
- `POST /api/members/:id/resend-email` — retry a round's result email `{ round }`
- `GET /api/contact`
- `PUT /api/contact/:id/status`
- `PUT /api/settings/theme`
- `PUT /api/settings`
- `GET /api/stats/admin`

Admin routes require:

`Authorization: Bearer YOUR_JWT_TOKEN`

## Setup

1. Install Node.js.
2. Create a MongoDB Atlas database.
3. Copy `.env.example` to `.env`.
4. Put your MongoDB connection string in `MONGODB_URI`.
5. Set a strong `JWT_SECRET`.
6. Set the frontend URL.

Install:

```bash
npm install
```

Create the first admin:

```bash
node scripts/createAdmin.js
```

Run locally:

```bash
npm start
```

Development:

```bash
npm run dev
```

Backend:

`http://localhost:5000`

API:

`http://localhost:5000/api`

## Frontend connection

For a Vite frontend, use:

```env
VITE_API_URL=http://localhost:5000/api
```

For production, set it to your deployed backend API, for example:

```env
VITE_API_URL=https://your-backend.vercel.app/api
```

## Theme button example

The frontend can use:

```js
const themes = ["violet", "inferno", "frost"];

function changeTheme(theme) {
  if (!themes.includes(theme)) return;

  localStorage.setItem("agentblazer-theme", theme);
  document.documentElement.dataset.theme = theme;
}
```

On page load:

```js
const savedTheme =
  localStorage.getItem("agentblazer-theme") || "violet";

document.documentElement.dataset.theme = savedTheme;
```

This is the correct approach for the three visitor-selectable theme buttons shown in the screenshots.
