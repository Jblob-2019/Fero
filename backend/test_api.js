const assert = require('assert');
const http = require('http');

async function runTests() {
  process.env.PORT = '4001';
  process.env.JWT_SECRET = 'test-secret-key-123';

  // Make a backup copy of destinations.json and users.json
  const fs = require('fs');
  const path = require('path');
  const destPath = path.join(__dirname, 'data', 'destinations.json');
  const usersPath = path.join(__dirname, 'data', 'users.json');
  const origDestContent = fs.readFileSync(destPath, 'utf-8');
  const origUsersContent = fs.existsSync(usersPath) ? fs.readFileSync(usersPath, 'utf-8') : null;

  const { app, server } = require('./server');

  const BASE = 'http://localhost:4001';

  async function test(name, fn) {
    process.stdout.write(`Testing: ${name}... `);
    try {
      await fn();
      console.log('✅ PASS');
    } catch (err) {
      console.log('❌ FAIL');
      console.error(err);
      throw err;
    }
  }

  let authToken = '';
  let createdDestinationId = null;

  try {
    // 1. Health check
    await test('GET /api/health returns 200 OK', async () => {
      const res = await fetch(`${BASE}/api/health`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.status, 'ok');
      assert.ok(data.features.auth);
    });

    // 2. Auth: Register
    await test('POST /api/auth/register returns 201 Created', async () => {
      const uniqueEmail = `tester_${Date.now()}@ferd.com`;
      const res = await fetch(`${BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Explorer',
          email: uniqueEmail,
          password: 'securePassword123'
        })
      });
      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.ok(data.token);
      assert.strictEqual(data.user.name, 'Test Explorer');
      assert.strictEqual(data.user.email, uniqueEmail);
    });

    // 3. Auth: Login with Seed Account
    await test('POST /api/auth/login returns 200 OK & JWT', async () => {
      const res = await fetch(`${BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@ferd.com',
          password: 'admin123'
        })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(data.token);
      assert.strictEqual(data.user.role, 'admin');
      authToken = data.token;
    });

    // 4. Auth: Profile me (401 without token)
    await test('GET /api/auth/me without token returns 401 Unauthorized', async () => {
      const res = await fetch(`${BASE}/api/auth/me`);
      assert.strictEqual(res.status, 401);
    });

    // 5. Auth: Profile me (200 with valid token)
    await test('GET /api/auth/me with Bearer token returns 200 OK', async () => {
      const res = await fetch(`${BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.user.email, 'admin@ferd.com');
    });

    // 6. Destinations: List (200 OK)
    await test('GET /api/destinations returns 200 OK with list', async () => {
      const res = await fetch(`${BASE}/api/destinations`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data));
      assert.ok(data.length > 0);
    });

    // 7. Destinations: Create without token (401 Unauthorized)
    await test('POST /api/destinations without token returns 401 Unauthorized', async () => {
      const res = await fetch(`${BASE}/api/destinations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Unauth Island' })
      });
      assert.strictEqual(res.status, 401);
    });

    // 8. Destinations: Create with missing required fields (400 Bad Request)
    await test('POST /api/destinations with missing fields returns 400 Bad Request', async () => {
      const res = await fetch(`${BASE}/api/destinations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ name: 'Incomplete Destination' })
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.ok(data.missingFields);
    });

    // 9. Destinations: Create with valid data (201 Created)
    await test('POST /api/destinations with valid data returns 201 Created', async () => {
      const newPlace = {
        name: 'Reykjavik Fjord Sanctuary',
        country: 'Iceland',
        tagline: 'Land of Fire, Ice & Aurora Dreams',
        overview: 'A breathtaking coastal gateway nestled beneath volcanic ridges and geothermal lagoons.',
        budget_category: '$$$',
        rating: 4.95,
        travel_interests: ['Nature', 'Adventure', 'Culture'],
        attractions: ['Hallgrímskirkja', 'Blue Lagoon', 'Harpa Concert Hall'],
        local_food: ['Plokkfiskur', 'Rúgbrauð', 'Kjötsúpa']
      };

      const res = await fetch(`${BASE}/api/destinations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify(newPlace)
      });

      assert.strictEqual(res.status, 201);
      assert.ok(res.headers.get('location'));
      const data = await res.json();
      assert.ok(data.id);
      assert.strictEqual(data.name, 'Reykjavik Fjord Sanctuary');
      createdDestinationId = data.id;
    });

    // 10. Destinations: Read created item (200 OK)
    await test('GET /api/destinations/:id retrieves newly created item', async () => {
      const res = await fetch(`${BASE}/api/destinations/${createdDestinationId}`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.id, createdDestinationId);
      assert.strictEqual(data.country, 'Iceland');
    });

    // 11. Destinations: Update item (PUT - 200 OK)
    await test('PUT /api/destinations/:id updates existing destination with 200 OK', async () => {
      const updatePayload = {
        tagline: 'Aurora Borealis & Midnight Sun Haven',
        rating: 5.0
      };

      const res = await fetch(`${BASE}/api/destinations/${createdDestinationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify(updatePayload)
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.tagline, 'Aurora Borealis & Midnight Sun Haven');
      assert.strictEqual(data.rating, 5.0);
      assert.strictEqual(data.country, 'Iceland'); // preserved
    });

    // 12. Destinations: Update non-existent item (PUT - 404 Not Found)
    await test('PUT /api/destinations/99999 returns 404 Not Found', async () => {
      const res = await fetch(`${BASE}/api/destinations/99999`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ name: 'Ghost City' })
      });
      assert.strictEqual(res.status, 404);
    });

    // 13. Destinations: Delete item (DELETE - 200 OK)
    await test('DELETE /api/destinations/:id removes destination with 200 OK', async () => {
      const res = await fetch(`${BASE}/api/destinations/${createdDestinationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` }
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.deletedId, createdDestinationId);
    });

    // 14. Destinations: Verify deletion (404 Not Found)
    await test('GET /api/destinations/:id after delete returns 404 Not Found', async () => {
      const res = await fetch(`${BASE}/api/destinations/${createdDestinationId}`);
      assert.strictEqual(res.status, 404);
    });

    // 15. Trip Match: POST /api/match returns ranked destinations
    await test('POST /api/match returns ranked recommendations (200 OK)', async () => {
      const res = await fetch(`${BASE}/api/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budget: '$$$',
          interests: ['Culture', 'Food']
        })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data));
      assert.ok(data[0].match >= data[data.length - 1].match);
    });

    console.log('\n🎉 ALL 15 AUTOMATED REST API & AUTH VERIFICATION TESTS PASSED SUCCESSFULLY!\n');
  } finally {
    // Restore original file states
    fs.writeFileSync(destPath, origDestContent, 'utf-8');
    if (origUsersContent) {
      fs.writeFileSync(usersPath, origUsersContent, 'utf-8');
    }
    server.close();
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
