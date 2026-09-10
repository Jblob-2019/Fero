const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { generateToken, authenticateToken, requireRole } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 4000;
const DATA_PATH = path.join(__dirname, 'data', 'destinations.json');
const USERS_PATH = path.join(__dirname, 'data', 'users.json');
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

// Helper to atomically persist destinations JSON
function saveDestinations(destinations) {
  try {
    fs.writeFileSync(DATA_PATH, JSON.stringify(destinations, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing destinations.json:', err);
    return false;
  }
}

// Helper to load users JSON
function getUsers() {
  try {
    if (!fs.existsSync(USERS_PATH)) {
      return [];
    }
    const raw = fs.readFileSync(USERS_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading users.json:', err);
    return [];
  }
}

// Helper to atomically persist users JSON
function saveUsers(users) {
  try {
    fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing users.json:', err);
    return false;
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

// =========================================
// --- 1. System & Authentication Routes ---
// =========================================

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    framework: 'Express.js',
    server: 'Ferð API Service',
    time: new Date().toISOString(),
    features: {
      auth: 'JWT (jsonwebtoken + bcryptjs)',
      crud: 'Full CRUD (GET, POST, PUT, DELETE)',
      statusCodes: [200, 201, 400, 401, 403, 404, 500]
    }
  });
});

// Register New User (201 Created)
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, role = 'user' } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Name, email, and password are required fields.'
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid email address format.'
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Password must be at least 6 characters long.'
    });
  }

  const users = getUsers();
  const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({
      error: 'Conflict',
      message: 'A user with this email address already exists.'
    });
  }

  const saltRounds = 10;
  const passwordHash = bcrypt.hashSync(password, saltRounds);
  const newId = users.length ? Math.max(...users.map(u => u.id || 0)) + 1 : 1;

  const newUser = {
    id: newId,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    passwordHash,
    role: role === 'admin' ? 'admin' : 'user',
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveUsers(users);

  const token = generateToken(newUser);

  res.status(201).json({
    message: 'User registered successfully.',
    token,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      createdAt: newUser.createdAt
    }
  });
});

// Login User & Obtain JWT (200 OK)
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Email and password are required.'
    });
  }

  const users = getUsers();
  const user = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());

  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid email or password.'
    });
  }

  const token = generateToken(user);

  res.status(200).json({
    message: 'Login successful.',
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

// Current User Profile (Protected - 200 OK)
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.status(200).json({
    authenticated: true,
    user: req.user
  });
});

// ====================================================
// --- 2. Destinations REST API Endpoints (Full CRUD) ---
// ====================================================

// GET /api/destinations - Read All (with optional search, budget, interest filters)
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

  res.status(200).json(destinations);
});

// GET /api/destinations/:id - Read Single Destination by ID
app.get('/api/destinations/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid destination ID parameter. Must be an integer.'
    });
  }

  const destinations = getDestinations();
  const destination = destinations.find(d => d.id === id);

  if (destination) {
    res.status(200).json(destination);
  } else {
    res.status(404).json({
      error: 'Not Found',
      message: `Destination with id ${id} not found.`
    });
  }
});

// POST /api/destinations - Create New Destination (Protected - 201 Created)
app.post('/api/destinations', authenticateToken, (req, res) => {
  const {
    name,
    country,
    tagline,
    overview,
    budget_category,
    rating = 4.8,
    image,
    images = [],
    best_travel_season = 'Year-round',
    travel_interests = [],
    attractions = [],
    local_food = []
  } = req.body;

  // Validate required fields
  const missingFields = [];
  if (!name) missingFields.push('name');
  if (!country) missingFields.push('country');
  if (!tagline) missingFields.push('tagline');
  if (!overview) missingFields.push('overview');
  if (!budget_category) missingFields.push('budget_category');

  if (missingFields.length > 0) {
    return res.status(400).json({
      error: 'Validation Error',
      message: `Missing required field(s): ${missingFields.join(', ')}`,
      missingFields
    });
  }

  // Validate budget category
  const validBudgets = ['$', '$$', '$$$'];
  if (!validBudgets.includes(budget_category)) {
    return res.status(400).json({
      error: 'Validation Error',
      message: `budget_category must be one of: ${validBudgets.join(', ')}`
    });
  }

  const destinations = getDestinations();
  const nextId = destinations.length ? Math.max(...destinations.map(d => Number(d.id) || 0)) + 1 : 1;

  const defaultImage = image || 'assets/images/default.jpg';
  const resolvedImages = Array.isArray(images) && images.length > 0 ? images : [defaultImage];

  const newDestination = {
    id: nextId,
    name: name.trim(),
    country: country.trim(),
    tagline: tagline.trim(),
    overview: overview.trim(),
    rating: Number(rating) || 4.8,
    image: defaultImage,
    images: resolvedImages,
    budget_category,
    best_travel_season,
    travel_interests: Array.isArray(travel_interests) ? travel_interests : [travel_interests],
    attractions: Array.isArray(attractions) ? attractions : [attractions],
    local_food: Array.isArray(local_food) ? local_food : [local_food],
    createdBy: req.user.email,
    createdAt: new Date().toISOString()
  };

  destinations.push(newDestination);
  const success = saveDestinations(destinations);

  if (!success) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to write destination data.'
    });
  }

  res.setHeader('Location', `/api/destinations/${newDestination.id}`);
  res.status(201).json(newDestination);
});

// PUT /api/destinations/:id - Update Existing Destination (Protected - 200 OK)
app.put('/api/destinations/:id', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid destination ID parameter. Must be an integer.'
    });
  }

  const destinations = getDestinations();
  const index = destinations.findIndex(d => d.id === id);

  if (index === -1) {
    return res.status(404).json({
      error: 'Not Found',
      message: `Destination with id ${id} not found.`
    });
  }

  const current = destinations[index];
  const {
    name,
    country,
    tagline,
    overview,
    rating,
    image,
    images,
    budget_category,
    best_travel_season,
    travel_interests,
    attractions,
    local_food
  } = req.body;

  // Validate budget category if updated
  if (budget_category && !['$', '$$', '$$$'].includes(budget_category)) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'budget_category must be one of: $, $$, $$$'
    });
  }

  // Update fields
  const updatedDestination = {
    ...current,
    name: name !== undefined ? name.trim() : current.name,
    country: country !== undefined ? country.trim() : current.country,
    tagline: tagline !== undefined ? tagline.trim() : current.tagline,
    overview: overview !== undefined ? overview.trim() : current.overview,
    rating: rating !== undefined ? Number(rating) : current.rating,
    image: image !== undefined ? image : current.image,
    images: images !== undefined ? (Array.isArray(images) ? images : [images]) : current.images,
    budget_category: budget_category !== undefined ? budget_category : current.budget_category,
    best_travel_season: best_travel_season !== undefined ? best_travel_season : current.best_travel_season,
    travel_interests: travel_interests !== undefined ? (Array.isArray(travel_interests) ? travel_interests : [travel_interests]) : current.travel_interests,
    attractions: attractions !== undefined ? (Array.isArray(attractions) ? attractions : [attractions]) : current.attractions,
    local_food: local_food !== undefined ? (Array.isArray(local_food) ? local_food : [local_food]) : current.local_food,
    updatedAt: new Date().toISOString(),
    updatedBy: req.user.email
  };

  destinations[index] = updatedDestination;
  const success = saveDestinations(destinations);

  if (!success) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update destination data.'
    });
  }

  res.status(200).json(updatedDestination);
});

// DELETE /api/destinations/:id - Remove Destination (Protected - 200 OK)
app.delete('/api/destinations/:id', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid destination ID parameter. Must be an integer.'
    });
  }

  const destinations = getDestinations();
  const target = destinations.find(d => d.id === id);

  if (!target) {
    return res.status(404).json({
      error: 'Not Found',
      message: `Destination with id ${id} not found.`
    });
  }

  const filtered = destinations.filter(d => d.id !== id);
  const success = saveDestinations(filtered);

  if (!success) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete destination.'
    });
  }

  res.status(200).json({
    message: `Destination '${target.name}' (ID: ${id}) was successfully deleted.`,
    deletedId: id
  });
});

// =========================================
// --- 3. Recommendation Matcher Service ---
// =========================================

// POST /api/match - Calculate Trip Match Recommendations
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
  res.status(200).json(scored);
});

// =========================================
// --- 4. Static Frontend File Serving ---
// =========================================

// Serve static client assets from final/frontend
app.use(express.static(FRONTEND_DIR, {
  extensions: ['html', 'htm'],
  index: 'index.html'
}));

// Route fallback for client-side routing / subpages
app.use((req, res, next) => {
  // If API path reached here, it's an unrecognized API route -> 404 JSON
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      error: 'Not Found',
      message: `API endpoint ${req.method} ${req.path} does not exist.`
    });
  }

  const requestedPath = path.join(FRONTEND_DIR, req.path);
  if (fs.existsSync(requestedPath) && fs.statSync(requestedPath).isFile()) {
    return res.sendFile(requestedPath);
  }
  // If requesting a page without .html extension
  const htmlPath = requestedPath + '.html';
  if (fs.existsSync(htmlPath) && fs.statSync(htmlPath).isFile()) {
    return res.sendFile(htmlPath);
  }
  // Otherwise fallback
  if (fs.existsSync(path.join(FRONTEND_DIR, 'index.html'))) {
    res.status(404).sendFile(path.join(FRONTEND_DIR, 'index.html'));
  } else {
    res.status(404).send('Page not found');
  }
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
  console.log('====================================================');
  console.log('  Ferð Backend Server (Node.js + Express.js)');
  console.log(`  Local URL:       http://localhost:${PORT}`);
  console.log(`  Health Check:    http://localhost:${PORT}/api/health`);
  console.log(`  Destinations:    http://localhost:${PORT}/api/destinations`);
  console.log(`  Auth Endpoints:  /api/auth/register, /api/auth/login, /api/auth/me`);
  console.log('====================================================');
});

module.exports = { app, server, getDestinations, saveDestinations, getUsers, saveUsers };
