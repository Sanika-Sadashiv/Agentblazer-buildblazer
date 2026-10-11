# Deployment checklist (Vercel: 2 projects from this repo)

## 0. Rotate secrets first
The old `.env` was shared in plain text. Create a NEW Gmail app password, a new MongoDB user password,
a new JWT_SECRET and a new admin password.

## 1. MongoDB Atlas
- Network Access -> add `0.0.0.0/0` (Vercel IPs change).
- Use a connection string that ends with a database name, e.g. `.../agentblazer?retryWrites=true&w=majority`.

## 2. Backend project (Vercel -> Root Directory = `backend`)
Environment variables:
| Name | Value |
|---|---|
| MONGODB_URI | your Atlas string |
| JWT_SECRET | long random string |
| FRONTEND_URL | https://agentblazer-frontend.vercel.app  (comma-separate several) |
| NODE_ENV | production |
| SMTP_HOST | smtp.gmail.com |
| SMTP_PORT | 587 |
| SMTP_USER | club gmail address |
| SMTP_PASS | Gmail app password (needs 2-Step Verification on) |
| CONTACT_RECIPIENT | (optional) inbox for contact-form mail |

After deploy open:
- `https://<backend>.vercel.app/api/health/db`   -> `{"connected":true,...}`
- `https://<backend>.vercel.app/api/health/smtp` -> `{"smtp":"ok"}`
- `https://<backend>.vercel.app/api/events`      -> JSON list (not an error)

## 3. Frontend project (Vercel -> Root Directory = `frontend`)
| Name | Value |
|---|---|
| VITE_API_URL | https://<backend>.vercel.app/api |

Redeploy the frontend after changing it (Vite bakes it in at build time).

## 4. Fill the database (run once, from your computer)
Put the same MONGODB_URI etc. in `backend/.env` (copy `.env.example`), then:
```
npm run install:all
npm run create-admin
cd backend
node scripts/seedWebsiteData.js   # events + core team + committee
node seedLeadership.js            # guests + faculty
```
Then log in at `/admin/login` - the data now shows in the dashboard.
