const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 4000;
const DATA_PATH = path.join(__dirname, 'data', 'destinations.json');
const FRONTEND_DIR = path.resolve(__dirname, '..', 'frontend');

// Helper to safely load destinations JSON
function getDestinations() {
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading destinations.json:', err);
    return [];
  }
}

// Global Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// --- REST API Endpoints ---

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    framework: 'Express.js',
    server: 'Ferð API Service',
    time: new Date().toISOString()
  });
});

// Get All Destinations (with optional search, budget, interest query filtering)
app.get('/api/destinations', (req, res) => {
  let destinations = getDestinations();
  const { search, budget, interest } = req.query;

  if (search) {
    const q = search.toLowerCase();
    destinations = destinations.filter(d =>
      d.name.toLowerCase().includes(q) ||
      (d.country && d.country.toLowerCase().includes(q)) ||
      (d.overview && d.overview.toLowerCase().includes(q))
    );
  }

  if (budget) {
    destinations = destinations.filter(d => d.budget_category === budget);
  }

  if (interest) {
    destinations = destinations.filter(d =>
      (d.travel_interests || []).some(i => i.toLowerCase() === interest.toLowerCase())
    );
  }

  res.json(destinations);
});

// Get Single Destination by ID
app.get('/api/destinations/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid destination ID parameter.' });
  }

  const destinations = getDestinations();
  const destination = destinations.find(d => d.id === id);

  if (destination) {
    res.json(destination);
  } else {
    res.status(404).json({ error: `Destination with id ${id} not found.` });
  }
});

// Calculate Trip Match Recommendations
app.post('/api/match', (req, res) => {
  const { budget, travelType, duration, interests = [] } = req.body;
  const destinations = getDestinations();

  const scored = destinations.map(dest => {
    let score = 70; // baseline

    if (budget && dest.budget_category === budget) score += 12;
    if (interests && Array.isArray(interests)) {
      const matchInterests = (dest.travel_interests || []).filter(i => interests.includes(i));
      score += matchInterests.length * 8;
    }
    score = Math.min(99, Math.max(65, score));

    return {
      ...dest,
      match: score
    };
  });

  scored.sort((a, b) => b.match - a.match);
  res.json(scored);
});

// --- Static Frontend File Serving ---
// Serve static client assets from final/frontend
app.use(express.static(FRONTEND_DIR, {
  extensions: ['html', 'htm'],
  index: 'index.html'
}));

// Route fallback for client-side routing / subpages
app.use((req, res) => {
  const requestedPath = path.join(FRONTEND_DIR, req.path);
  if (fs.existsSync(requestedPath) && fs.statSync(requestedPath).isFile()) {
    return res.sendFile(requestedPath);
  }
  // If requesting a page without .html extension
  const htmlPath = requestedPath + '.html';
  if (fs.existsSync(htmlPath) && fs.statSync(htmlPath).isFile()) {
    return res.sendFile(htmlPath);
  }
  // Otherwise 404
  res.status(404).sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Start Express Server
const server = app.listen(PORT, () => {
  console.log('=========================================');
  console.log('  Ferð Backend Server (Node.js + Express.js)');
  console.log(`  Local URL:    http://localhost:${PORT}`);
  console.log(`  API Endpoint: http://localhost:${PORT}/api/destinations`);
  console.log(`  Health Check: http://localhost:${PORT}/api/health`);
  console.log('=========================================');
});

module.exports = { app, server };
