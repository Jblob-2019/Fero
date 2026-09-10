# Ferð — Backend Service (Node.js + Express.js)

This directory contains the REST API server and static delivery layer for the Ferð travel discovery platform, powered by **Node.js** and **Express.js**.

## Directory Layout

```
backend/
├── data/
│   ├── destinations.json   # Primary destination dataset
│   └── users.json          # User accounts with bcrypt hashed passwords
├── middleware/
│   └── auth.js             # JWT verification & role authorization middleware
├── server.js               # Express.js REST API & static server
├── test_api.js             # Automated test suite (Auth, CRUD, Status Codes)
├── package.json            # NPM dependencies (express, cors, jsonwebtoken, bcryptjs)
└── README.md
```

## Running the Backend

From the `backend/` directory:
```bash
# Install dependencies
npm install

# Start production server
npm start
```

To run with live auto-reload during development:
```bash
npm run dev
```

To run the automated verification test suite:
```bash
npm test
```

---

## API Endpoints Summary

For complete schema details and JSON response payloads, see **[`../../docs/api.md`](../docs/api.md)**.

| Method | Endpoint | Auth | Success Code | Description |
|---|---|---|---|---|
| `GET` | `/api/health` | No | `200 OK` | Health check & framework indicator (Express.js) |
| `POST` | `/api/auth/register` | No | `201 Created` | Registers a new user account and returns JWT |
| `POST` | `/api/auth/login` | No | `200 OK` | Validates credentials and returns JWT token |
| `GET` | `/api/auth/me` | **Bearer** | `200 OK` | Returns currently authenticated user profile |
| `GET` | `/api/destinations` | No | `200 OK` | Returns destinations (supports `?search=`, `?budget=`, `?interest=`) |
| `GET` | `/api/destinations/:id` | No | `200 OK` | Returns single destination record by ID |
| `POST` | `/api/destinations` | **Bearer** | `201 Created` | Creates a new destination record |
| `PUT` | `/api/destinations/:id` | **Bearer** | `200 OK` | Updates an existing destination record |
| `DELETE` | `/api/destinations/:id` | **Bearer** | `200 OK` | Removes a destination record |
| `POST` | `/api/match` | No | `200 OK` | Trip recommendation match scoring algorithm |

---

## Seed Accounts for Testing

- **Administrator**: `admin@ferd.com` / `admin123`
- **Traveler**: `traveler@ferd.com` / `traveler123`

## Unified Architecture & Ports

- **Backend API Service**: Running on **`http://localhost:4000`**
- **Frontend Client Application**: Running on **`http://localhost:3000`**
- CORS is enabled via `cors` middleware, and the frontend server on `:3000` proxies `/api/*` to `:4000`.
