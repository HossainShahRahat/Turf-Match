# Turf-Match

Turf-Match is a full-stack web application for managing turf sports tournaments, players, matches, and related features. It includes an admin panel for tournament management, player dashboards, live match tracking, and more.

## Features

### Frontend

- **Home Page**: Dashboard overview
- **Tournament Management**: View, create, and manage tournaments
- **Player Management**: Profiles, dashboards, transfers
- **Live Matches**: Real-time match tracking
- **Match Results**: Post-match results entry and viewing
- **Admin Panel**: Full admin controls including settings and login
- **Authentication**: Secure login for players and admins
- Responsive UI with Tailwind CSS

### Backend

- **RESTful APIs** for tournaments, players, matches, stats, transfers
- **Admin Sync Service**: Automated admin operations
- **Cloudinary Integration**: For uploads (images/profiles)
- **Authentication Middleware**
- **MongoDB Models**: Admin, Match, Player, Tournament, TransferRequest

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Axios for API calls
- **Backend**: Node.js, Express.js, Mongoose (MongoDB)
- **Database**: MongoDB
- **File Storage**: Cloudinary
- **Deployment**: Vercel (frontend), Render (backend), Vercel.json configs present

## Prerequisites

- Node.js (v18+)
- MongoDB (local or Atlas)
- Cloudinary account (for uploads)

## Quick Start

### Backend Setup

```bash
cd backend
npm install
# Set environment variables: MONGODB_URI, CLOUDINARY_URL, JWT_SECRET, etc.
npm run dev  # or npm start
```

Server runs on `http://localhost:5000` (check server.js).

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

App runs on `http://localhost:5173`.

### Environment Variables

Create `.env` files in backend/frontend as needed:

```
# backend/.env
MONGODB_URI=your_mongo_connection_string
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# frontend/app-config.js or .env
VITE_API_URL=http://localhost:5000/api
VITE_CLOUDINARY_CLOUD_NAME=...
```

## API Endpoints

```
POST /api/auth/login
GET /api/players
GET /api/tournaments
POST /api/matches
GET /api/stats
...
```

See backend/src/routes/ for full details.

## Deployment

- **Frontend**: `npm run build` → Deploy to Vercel (vercel.json provided)
- **Backend**: `npm run build` → Deploy to Render (render.yaml provided)
- Update API URLs in production config.

## Project Structure

```
Turf-Match/
├── backend/          # Express API server
├── frontend/         # React Vite app
├── TODO.md           # Development todos
└── package.json      # Root dependencies (build scripts)
```

## Development

- See `TODO.md`, `TODO-react.md`, `TODO-feature-complete.md` for pending tasks.
- Use `build.js` for custom builds.

## Contributing

Fork the repo, create a branch, make changes, submit PR.

## License

MIT
