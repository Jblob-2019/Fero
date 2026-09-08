# Ferð Travel Platform

The final release of Ferð is structured into distinct front-end and back-end workspaces:

## Structure

```
fero final/
├── frontend/   # Client-side web application (HTML5, CSS3, ES6 JS, SVG assets)
└── backend/    # API server & data layer (Node.js + Express.js REST server, destinations dataset)
```

## Quick Start (Single Command)

To run both the **frontend (:3000)** and **backend (:4000)** concurrently with a single command:

```bash
npm run dev
```

### Access Points
- **Frontend Web App**: **[http://localhost:3000](http://localhost:3000)**
- **Backend Express API**: **[http://localhost:4000](http://localhost:4000)**
- **API Health Check**: **[http://localhost:4000/api/health](http://localhost:4000/api/health)**
- **Destinations Catalog**: **[http://localhost:4000/api/destinations](http://localhost:4000/api/destinations)**

---

### Running Separately (Optional)

If you wish to run each service in separate terminals:
- **Backend**: `cd backend && npm start` (runs on `:4000`)
- **Frontend**: `cd frontend && npm start` (runs on `:3000`)
