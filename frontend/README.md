# Ferð — Frontend Client

This directory contains the client-side user interface for Ferð, built with semantic HTML5, modern vanilla CSS tokens, and modular ES6 JavaScript.

## Directory Layout

```
frontend/
├── index.html              # Main Discovery / Landing Page
├── pages/
│   ├── explore.html        # Interactive Explore & Filter Directory
│   ├── destination.html    # Dynamic Destination Detail Page (?id=)
│   ├── favorites.html      # Saved Bookmarks Page
│   ├── about.html          # About & Methodology Page
│   └── food-culture.html   # Culinary & Cultural highlights
├── css/
│   ├── main.css            # Unified Design System & Typography
│   ├── variables.css       # Color tokens, typography, and spacing
│   ├── layout.css          # Macro layout grids and flex containers
│   └── components.css      # Reusable UI component styling
├── js/
│   ├── main.js             # Navigation, drawer, match quiz wiring
│   ├── featured.js         # Card rendering and /api/destinations integration
│   ├── destination-details.js # Single destination view logic
│   ├── filters.js          # Search, budget, and interest tagging
│   ├── favorites.js        # LocalStorage bookmark persistence
│   └── recommendations.js  # Recommendation scoring algorithm
├── assets/
│   └── images/             # Vector SVGs for destinations & branding
└── data/
    └── destinations.json   # Static fallback dataset
```

## Running the Frontend (Port 3000)

From the `final/frontend` directory:
```bash
node server.js
```
or:
```bash
npm start
```
The frontend server runs on **`http://localhost:3000`** and proxies API calls to the Express backend on `http://localhost:4000`.
