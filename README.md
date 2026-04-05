# FleetXpress — Online Transport Management System

Full-stack fleet management dashboard with real backend, SQLite database, JWT auth, and REST API.

---

## Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Backend    | Node.js + Express                 |
| Database   | SQLite (via better-sqlite3)       |
| Auth       | JWT (jsonwebtoken) + bcryptjs     |
| Frontend   | Vanilla HTML/CSS/JS               |
| Maps       | Leaflet + OpenStreetMap (free)    |
| Charts     | Chart.js                          |
| Hosting    | Render (free tier)                |

---

## Default Credentials

| Role   | Username | Password    |
|--------|----------|-------------|
| Admin  | admin    | admin1234   |
| Driver | driver1  | driver123   |

---

## Run Locally

### Prerequisites
- Node.js 18+ installed → https://nodejs.org

### Steps

```bash
# 1. Download / unzip the project
cd fleetxpress

# 2. Install dependencies
npm install

# 3. Copy env file
cp .env.example .env

# 4. Start the server
npm start
```

Open http://localhost:3000 in your browser.

For live-reload during development:
```bash
npm run dev
```

---

## Project Structure

```
fleetxpress/
├── server/
│   ├── index.js              ← Express app entry point
│   ├── db.js                 ← SQLite setup + schema + seed
│   ├── middleware/
│   │   └── auth.js           ← JWT verify + role check
│   └── routes/
│       ├── auth.js           ← POST /api/auth/login|logout, GET /api/auth/me
│       ├── vehicles.js       ← GET|POST|PATCH|DELETE /api/vehicles
│       ├── drivers.js        ← GET|POST|PATCH|DELETE /api/drivers
│       ├── routes.js         ← GET|POST|PATCH|DELETE /api/routes
│       ├── issues.js         ← GET|POST|PATCH /api/issues
│       ├── gps.js            ← POST /api/gps, GET /api/gps/latest|history
│       └── stats.js          ← GET /api/stats (dashboard summary)
├── public/
│   └── index.html            ← Complete frontend (single file)
├── data/                     ← Created automatically (SQLite DB lives here)
├── package.json
├── render.yaml               ← Render deployment config
├── .env.example
└── .gitignore
```

---

## API Endpoints

### Auth
| Method | Endpoint           | Auth | Description          |
|--------|--------------------|------|----------------------|
| POST   | /api/auth/login    | ❌   | Login, returns JWT   |
| POST   | /api/auth/logout   | ✅   | Clear cookie         |
| GET    | /api/auth/me       | ✅   | Get current user     |

### Vehicles
| Method | Endpoint            | Role  | Description        |
|--------|---------------------|-------|--------------------|
| GET    | /api/vehicles       | Any   | List all vehicles  |
| GET    | /api/vehicles/:id   | Any   | Get one vehicle    |
| POST   | /api/vehicles       | Admin | Add vehicle        |
| PATCH  | /api/vehicles/:id   | Admin | Edit vehicle       |
| DELETE | /api/vehicles/:id   | Admin | Delete vehicle     |

### Drivers
| Method | Endpoint           | Role  | Description       |
|--------|--------------------|-------|-------------------|
| GET    | /api/drivers       | Any   | List all drivers  |
| GET    | /api/drivers/:id   | Any   | Get one driver    |
| POST   | /api/drivers       | Admin | Add driver        |
| PATCH  | /api/drivers/:id   | Admin | Edit driver       |
| DELETE | /api/drivers/:id   | Admin | Delete driver     |

### Routes
| Method | Endpoint          | Role  | Description      |
|--------|-------------------|-------|------------------|
| GET    | /api/routes       | Any   | List all routes  |
| POST   | /api/routes       | Admin | Add route        |
| PATCH  | /api/routes/:id   | Admin | Edit route       |
| DELETE | /api/routes/:id   | Admin | Delete route     |

### Issues
| Method | Endpoint                  | Role  | Description       |
|--------|---------------------------|-------|-------------------|
| GET    | /api/issues               | Any   | List issues       |
| POST   | /api/issues               | Any   | Report issue      |
| PATCH  | /api/issues/:id/resolve   | Admin | Mark resolved     |
| DELETE | /api/issues/:id           | Admin | Delete issue      |

### GPS
| Method | Endpoint               | Role  | Description              |
|--------|------------------------|-------|--------------------------|
| POST   | /api/gps               | Any   | Post vehicle position    |
| GET    | /api/gps/latest        | Any   | Latest pos per vehicle   |
| GET    | /api/gps/history/:id   | Any   | Last 50 positions        |

### Stats
| Method | Endpoint    | Auth | Description           |
|--------|-------------|------|-----------------------|
| GET    | /api/stats  | ✅   | Dashboard summary     |

---

## Deploy to Render (Free)

1. Push this folder to a **GitHub repository**

2. Go to https://render.com → Sign up (free)

3. Click **New → Web Service** → Connect your GitHub repo

4. Render auto-detects `render.yaml` — just click **Deploy**

5. Render will:
   - Run `npm install`
   - Start `node server/index.js`
   - Create a `/data` persistent disk for SQLite
   - Generate a random `JWT_SECRET` automatically

6. Your app URL will be: `https://fleetxpress-xxxx.onrender.com`

> **Note:** Free Render instances spin down after 15 minutes of inactivity. First request after sleep takes ~30 seconds to wake up. Upgrade to Starter ($7/mo) for always-on.

---

## Environment Variables

| Variable     | Required | Description                          |
|--------------|----------|--------------------------------------|
| PORT         | No       | Server port (default 3000)           |
| JWT_SECRET   | Yes (prod)| Secret for signing JWTs             |
| NODE_ENV     | No       | Set to `production` on Render        |
| RENDER       | No       | Set to `true` on Render (DB path)    |

---

## Adding Real GPS (Future)

To push real vehicle positions from a driver's phone/device:

```bash
curl -X POST https://your-app.onrender.com/api/gps \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"vehicle_id": 1, "latitude": 13.0358, "longitude": 80.0911, "speed": 35}'
```

The admin dashboard Live Tracking page polls `/api/gps/latest` every 5 seconds and places markers.
