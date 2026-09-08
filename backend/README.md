# Ferð — Backend Service (Node.js + Express.js)

This directory contains the REST API server and static delivery layer for the Ferð travel discovery platform, powered by **Node.js** and **Express.js**.

## Directory Layout

```
backend/
├── data/
│   └── destinations.json   # Primary destination dataset
├── server.js               # Node.js + Express.js REST API & static server
├── package.json            # NPM dependencies (express, cors) & scripts
└── README.md
```

## Running the Backend

From the `final/backend` directory:
```bash
# Install dependencies
npm install

# Start production server
npm start
```
or:
```bash
node server.js
```

To run with live auto-reload during development:
```bash
npm run dev
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check & framework indicator (Express.js) |
| `GET` | `/api/destinations` | Returns list of all destinations (supports `?search=`, `?budget=`, `?interest=`) |
| `GET` | `/api/destinations/:id` | Returns single destination record by ID (with 404 handling) |
| `POST` | `/api/match` | Accepts trip preferences and returns ranked destination matches |

## Unified Architecture & Ports

- **Backend API Service**: Running on **`http://localhost:4000`**
- **Frontend Client Application**: Running on **`http://localhost:3000`**
- CORS is enabled via `cors` middleware, and the frontend server on `:3000` proxies `/api/*` to `:4000`.
