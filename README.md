# StitchSmart – Smart Tailoring Order & Fabric Demand Prediction System

A complete MERN stack web application designed for modern tailoring shops, boutiques, and fashion designers to streamline custom garment ordering, digital body measurements, workload-based delivery scheduling, and fabric demand prediction.

---

## 🛠️ Tech Stack

- **Frontend**: React.js (Bootstrapped with [Vite](https://vitejs.dev/))
- **Backend**: Node.js & Express.js
- **Database**: MongoDB (Phase 2 integration)
- **ODM**: Mongoose
- **API Architecture**: RESTful API
- **Styling**: Modern Vanilla CSS
- **Testing & Tooling**: Postman, VS Code / Antigravity

---

## 📁 Project Structure

```text
StitchSmart/
├── client/                     # Frontend React application (Vite)
│   ├── public/                 # Static assets
│   ├── src/                    # React source code (components, styles, App.jsx)
│   ├── index.html              # HTML entry point
│   ├── package.json            # Client dependencies and scripts
│   └── vite.config.js          # Vite configuration with API proxy
├── server/                     # Backend Node.js + Express application
│   ├── config/                 # Configuration files (Database, environment)
│   │   └── db.js               # MongoDB Mongoose connection configuration
│   ├── controllers/            # Request handlers / Business logic
│   │   └── healthController.js # Health check controller
│   ├── models/                 # Mongoose schemas & data models (Phase 2)
│   ├── routes/                 # Express API routes
│   │   └── healthRoutes.js     # Health check route (GET /api/health)
│   ├── middleware/             # Express custom middlewares (Phase 2)
│   ├── .env                    # Environment variables (PORT, MONGO_URI)
│   ├── .env.example            # Example environment template
│   ├── package.json            # Backend dependencies and scripts
│   └── server.js               # Express application entry point
├── .gitignore                  # Git ignore rules for node_modules, .env, etc.
└── README.md                   # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or higher (Installed: v24.x)
- **npm**: v9.0.0 or higher (Installed: v11.x)
- **MongoDB**: Local Community Server or MongoDB Atlas (For subsequent phases)

---

### 1. Backend Setup (Server)

Navigate to the `server` directory, install dependencies, and start the server:

```bash
cd server
npm install
npm run dev   # Starts with Node watch mode (or npm start)
```

The backend server runs on `http://localhost:5000` by default.

#### API Health Check
You can verify the backend is running by accessing:
- **Endpoint**: `GET /api/health`
- **URL**: [http://localhost:5000/api/health](http://localhost:5000/api/health)
- **Sample Response**:
  ```json
  {
    "status": "ok",
    "message": "StitchSmart API is running",
    "database": {
      "status": "connected",
      "readyState": 1,
      "name": "stitchsmart"
    },
    "timestamp": "2026-10-17T06:33:47.163Z",
    "uptime": 25,
    "service": "StitchSmart Backend Service"
  }
  ```

---

### 2. Frontend Setup (Client)

In a separate terminal, navigate to the `client` directory, install dependencies, and start the Vite development server:

```bash
cd client
npm install
npm run dev
```

The frontend application runs on `http://localhost:5173` (or the port assigned by Vite).

---

## 📋 Project Phases Roadmap

- [x] **Phase 1: Project Scaffolding & Architecture**
  - MERN stack folder structure
  - Vite React frontend initialization
  - Express.js backend setup
  - Health check API route (`GET /api/health`)
  - Cross-Origin Resource Sharing (CORS) & environment config
- [x] **Phase 2: MongoDB Database Setup**
  - Mongoose integration
  - Environment variable configuration (`MONGO_URI`)
  - Safe `.env.example` template & `.gitignore` protection
  - Modular `server/config/db.js` with connection logging
  - Real-time database readiness in `/api/health`
- [x] **Phase 3: User Authentication & Role Management**
  - Mongoose User model with unique normalized email and password hashing (`bcryptjs`)
  - JWT token generation with secure HttpOnly cookies & Bearer fallback
  - REST endpoints: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`
  - Reusable `protect` and `authorize` middleware (Customer vs Admin RBAC)
  - React AuthContext, Login, Registration, and Customer Dashboard UI
- [x] **Phase 4: Customer Profile & Measurements (cm)**
  - Mongoose `Profile` model (unique customer reference, address, normalized contact info)
  - Mongoose `Measurement` model (9 precision tailoring metrics in centimetres with strict bounds)
  - REST endpoints: `GET/PUT /api/profile/me`, `GET/POST/PUT /api/measurements/me`
  - Admin/Tailor customer lookup endpoints: `GET /api/profile/customer/:id`, `GET /api/measurements/customer/:id`
  - Customer ownership enforcement & prevention of mass-assignment (`role`, `user`, `customer`)
  - React `CustomerProfile` and `MeasurementForm` components with real-time `cm` units and validation
- [ ] **Phase 5: Order Management & Workflow Tracking**
  - Multi-stage production tracking (7-stage lifecycle)
  - Custom design upload & Indian Rupee (₹) pricing standard
- [ ] **Phase 6: Smart Workload-Based Delivery Scheduling**
  - Tailor daily capacity slotting (default 10 units/day)
- [ ] **Phase 7: Fabric Demand Prediction Module**
  - Historical consumption data aggregation
  - High/Medium/Low demand forecasting
