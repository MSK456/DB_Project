# RideFlow

A full-stack ride-hailing platform.

## Project Structure

```
Ride Flow/
├── rideflow-backend/     # Node.js + Express + MySQL API
│   ├── src/
│   │   ├── app.js
│   │   ├── index.js
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── db/
│   │   ├── middlewares/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── sql/
│   │   ├── utils/
│   │   └── validators/
│   ├── public/temp/      # Multer temp upload folder
│   ├── .env              # Backend environment variables
│   ├── .env.example
│   └── package.json
│
└── rideflow-frontend/    # React + Vite SPA
    ├── src/
    ├── .env              # Frontend environment variables
    └── package.json
```

## Setup

### Backend
```bash
cd rideflow-backend
npm install
# Copy .env.example to .env and fill in values
npm run dev
```

### Frontend
```bash
cd rideflow-frontend
npm install
# Copy .env.example to .env and fill in values
npm run dev
```

## Deployment
- **Backend**: Deploy `rideflow-backend/` to Render as a Web Service
  - Build command: `npm install`
  - Start command: `npm start`
- **Frontend**: Deploy `rideflow-frontend/` to Render/Vercel as a Static Site
  - Build command: `npm run build`
  - Publish directory: `dist`