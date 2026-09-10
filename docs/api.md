# Ferð Travel Platform — REST API Reference Documentation

This document describes the complete REST API specification for the **Ferð** travel discovery backend service (`Express.js` + `Node.js`).

---

## 1. Overview & Architecture

- **Base URL (Local)**: `http://localhost:4000`
- **Frontend Client**: `http://localhost:3000`
- **Data Format**: `application/json` (UTF-8)
- **CORS**: Enabled globally (`cors` middleware)
- **Stateless Design**: All user authorization state is verified cryptographically via JSON Web Tokens (JWT) in request headers.

---

## 2. Authentication & Authorization

Protected endpoints require a standard **Bearer Token** sent via the HTTP `Authorization` header:

```http
Authorization: Bearer <your_jwt_token>
```

### Default Seed Accounts

The backend ships pre-seeded accounts stored in `data/users.json` with passwords hashed using `bcrypt` (10 salt rounds):

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Admin** | `admin@ferd.com` | `admin123` | Full access: Read, Create, Update, Delete |
| **User** | `traveler@ferd.com` | `traveler123` | Read, Create, Update, Delete |

New accounts can also be created at any time using `POST /api/auth/register`.

---

## 3. HTTP Methods & Status Codes Matrix

| Status Code | Meaning | Used In |
|---|---|---|
| **`200 OK`** | Request succeeded | `GET`, `PUT`, `DELETE`, `POST /api/auth/login`, `POST /api/match` |
| **`201 Created`** | Resource successfully created | `POST /api/destinations`, `POST /api/auth/register` |
| **`400 Bad Request`** | Validation error or invalid query/param | Missing required fields, invalid ID format, malformed email |
| **`401 Unauthorized`** | Missing or malformed token / bad credentials | Missing `Authorization` header, invalid email/password |
| **`403 Forbidden`** | Expired/tampered token or insufficient role | Token signature verification failure, expired JWT |
| **`404 Not Found`** | Resource does not exist | Destination ID not found, unknown endpoint |
| **`500 Internal Server Error`** | Unhandled server error | File read/write failure, unexpected runtime exceptions |

---

## 4. Endpoints Summary Table

| Method | Endpoint | Auth Required | Success Status | Description |
|---|---|---|---|---|
| `GET` | `/api/health` | No | `200 OK` | Server health check and feature capability report |
| `POST` | `/api/auth/register` | No | `201 Created` | Registers a new user and issues a JWT token |
| `POST` | `/api/auth/login` | No | `200 OK` | Validates credentials and returns a JWT token |
| `GET` | `/api/auth/me` | **Yes (Bearer)** | `200 OK` | Returns the authenticated user's profile |
| `GET` | `/api/destinations` | No | `200 OK` | Retrieves all destinations with optional filtering |
| `GET` | `/api/destinations/:id` | No | `200 OK` | Retrieves a single destination by integer ID |
| `POST` | `/api/destinations` | **Yes (Bearer)** | `201 Created` | Creates a new destination record |
| `PUT` | `/api/destinations/:id` | **Yes (Bearer)** | `200 OK` | Updates an existing destination by ID |
| `DELETE` | `/api/destinations/:id` | **Yes (Bearer)** | `200 OK` | Removes a destination by ID |
| `POST` | `/api/match` | No | `200 OK` | Calculates match scores based on user travel preferences |

---

## 5. Detailed Endpoint Specifications

### 5.1 System & Health

#### `GET /api/health`
Checks server availability, framework, and active features.

- **Request Headers**: None
- **Response `200 OK`**:
```json
{
  "status": "ok",
  "framework": "Express.js",
  "server": "Ferð API Service",
  "time": "2026-09-09T19:20:00.000Z",
  "features": {
    "auth": "JWT (jsonwebtoken + bcryptjs)",
    "crud": "Full CRUD (GET, POST, PUT, DELETE)",
    "statusCodes": [200, 201, 400, 401, 403, 404, 500]
  }
}
```

---

### 5.2 Authentication Endpoints

#### `POST /api/auth/register`
Creates a new user profile and returns a signed JWT token.

- **Request Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "name": "Sarah Connor",
  "email": "sarah@example.com",
  "password": "strongPassword123",
  "role": "user"
}
```
- **Response `201 Created`**:
```json
{
  "message": "User registered successfully.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 3,
    "name": "Sarah Connor",
    "email": "sarah@example.com",
    "role": "user",
    "createdAt": "2026-09-09T19:20:00.000Z"
  }
}
```
- **Error Responses**:
  - `400 Bad Request`: Missing fields, invalid email format, password < 6 chars, or duplicate email.

---

#### `POST /api/auth/login`
Validates user credentials against bcrypt-hashed passwords and returns a JWT token.

- **Request Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "email": "admin@ferd.com",
  "password": "admin123"
}
```
- **Response `200 OK`**:
```json
{
  "message": "Login successful.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "Ferð Admin",
    "email": "admin@ferd.com",
    "role": "admin"
  }
}
```
- **Error Responses**:
  - `400 Bad Request`: Missing `email` or `password`.
  - `401 Unauthorized`: Invalid email or password mismatch.

---

#### `GET /api/auth/me`
Fetches the current user profile from the verified JWT payload.

- **Request Headers**:
  - `Authorization: Bearer <your_jwt_token>`
- **Response `200 OK`**:
```json
{
  "authenticated": true,
  "user": {
    "id": 1,
    "name": "Ferð Admin",
    "email": "admin@ferd.com",
    "role": "admin",
    "iat": 1788960000,
    "exp": 1789046400
  }
}
```
- **Error Responses**:
  - `401 Unauthorized`: Missing `Authorization` header or missing Bearer token.
  - `403 Forbidden`: Token is invalid or expired.

---

### 5.3 Destinations Full CRUD Endpoints

#### `GET /api/destinations`
Returns the array of destination objects. Supports query string filtering.

- **Query Parameters**:
  - `search` (string, optional): Substring filter on name, country, or overview (e.g. `?search=japan`).
  - `budget` (string, optional): Exact filter by budget category: `$`, `$$`, or `$$$` (e.g. `?budget=$$$`).
  - `interest` (string, optional): Case-insensitive match on travel interests (e.g. `?interest=Food`).
- **Response `200 OK`**:
```json
[
  {
    "id": 1,
    "name": "Tokyo",
    "country": "Japan",
    "tagline": "Neon Horizons & Sacred Shrines",
    "overview": "Tokyo is a vibrant destination where traditional Japanese culture meets modern city life...",
    "rating": 4.9,
    "image": "assets/images/tokyo.jpg",
    "images": [
      "assets/images/tokyo.jpg",
      "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=800&q=80"
    ],
    "budget_category": "$$$",
    "best_travel_season": "Spring",
    "travel_interests": ["Food", "Culture", "Adventure"],
    "attractions": ["Shibuya Crossing", "Sensō-ji Temple", "Tokyo Skytree"],
    "local_food": ["Sushi", "Ramen", "Tempura", "Yakitori"]
  }
]
```

---

#### `GET /api/destinations/:id`
Retrieves a single destination by its numeric ID.

- **URL Parameters**:
  - `id` (integer, required): Unique destination identifier (e.g. `/api/destinations/1`).
- **Response `200 OK`**:
```json
{
  "id": 1,
  "name": "Tokyo",
  "country": "Japan",
  "tagline": "Neon Horizons & Sacred Shrines",
  "overview": "Tokyo is a vibrant destination where traditional Japanese culture meets modern city life...",
  "rating": 4.9,
  "budget_category": "$$$",
  "best_travel_season": "Spring",
  "travel_interests": ["Food", "Culture", "Adventure"],
  "attractions": ["Shibuya Crossing", "Sensō-ji Temple", "Tokyo Skytree"],
  "local_food": ["Sushi", "Ramen", "Tempura", "Yakitori"]
}
```
- **Error Responses**:
  - `400 Bad Request`: `id` is not a valid integer.
  - `404 Not Found`: Destination with specified ID was not found.

---

#### `POST /api/destinations`
Creates a new destination record.

- **Authentication**: **Required** (`Authorization: Bearer <token>`)
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>`
- **Request Body**:
```json
{
  "name": "Reykjavik",
  "country": "Iceland",
  "tagline": "Land of Fire, Ice & Aurora Dreams",
  "overview": "A breathtaking coastal gateway nestled beneath volcanic ridges and geothermal lagoons.",
  "budget_category": "$$$",
  "rating": 4.9,
  "best_travel_season": "Winter",
  "travel_interests": ["Nature", "Adventure", "Culture"],
  "attractions": ["Hallgrímskirkja", "Blue Lagoon", "Harpa"],
  "local_food": ["Plokkfiskur", "Rúgbrauð"]
}
```
- **Response `201 Created`**:
  - **Headers**: `Location: /api/destinations/8`
  - **Body**:
```json
{
  "id": 8,
  "name": "Reykjavik",
  "country": "Iceland",
  "tagline": "Land of Fire, Ice & Aurora Dreams",
  "overview": "A breathtaking coastal gateway nestled beneath volcanic ridges and geothermal lagoons.",
  "rating": 4.9,
  "image": "assets/images/default.jpg",
  "images": ["assets/images/default.jpg"],
  "budget_category": "$$$",
  "best_travel_season": "Winter",
  "travel_interests": ["Nature", "Adventure", "Culture"],
  "attractions": ["Hallgrímskirkja", "Blue Lagoon", "Harpa"],
  "local_food": ["Plokkfiskur", "Rúgbrauð"],
  "createdBy": "admin@ferd.com",
  "createdAt": "2026-09-09T19:20:00.000Z"
}
```
- **Error Responses**:
  - `400 Bad Request`: Missing required fields (`name`, `country`, `tagline`, `overview`, `budget_category`) or invalid `budget_category`.
  - `401 Unauthorized`: Missing or invalid Bearer token.
  - `403 Forbidden`: Token expired or invalid.

---

#### `PUT /api/destinations/:id`
Updates an existing destination record by ID.

- **Authentication**: **Required** (`Authorization: Bearer <token>`)
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>`
- **URL Parameters**:
  - `id` (integer, required): Destination ID to update.
- **Request Body** (provide only fields to update):
```json
{
  "tagline": "Midnight Sun & Geothermal Wonders",
  "rating": 5.0,
  "budget_category": "$$$"
}
```
- **Response `200 OK`**:
```json
{
  "id": 8,
  "name": "Reykjavik",
  "country": "Iceland",
  "tagline": "Midnight Sun & Geothermal Wonders",
  "overview": "A breathtaking coastal gateway nestled beneath volcanic ridges and geothermal lagoons.",
  "rating": 5.0,
  "budget_category": "$$$",
  "updatedAt": "2026-09-09T19:22:00.000Z",
  "updatedBy": "admin@ferd.com"
}
```
- **Error Responses**:
  - `400 Bad Request`: Invalid ID or invalid budget category.
  - `401 Unauthorized`: Missing or invalid Bearer token.
  - `404 Not Found`: No destination found matching the provided ID.

---

#### `DELETE /api/destinations/:id`
Permanently removes a destination record from the dataset.

- **Authentication**: **Required** (`Authorization: Bearer <token>`)
- **Headers**:
  - `Authorization: Bearer <token>`
- **URL Parameters**:
  - `id` (integer, required): Destination ID to delete.
- **Response `200 OK`**:
```json
{
  "message": "Destination 'Reykjavik' (ID: 8) was successfully deleted.",
  "deletedId": 8
}
```
- **Error Responses**:
  - `400 Bad Request`: Invalid ID format.
  - `401 Unauthorized`: Missing or invalid Bearer token.
  - `404 Not Found`: Destination with specified ID does not exist.

---

### 5.4 Trip Recommendation Engine

#### `POST /api/match`
Calculates destination match compatibility percentages based on user preferences.

- **Request Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "budget": "$$$",
  "travelType": "Solo",
  "duration": "7-14 days",
  "interests": ["Culture", "Food"]
}
```
- **Response `200 OK`**:
```json
[
  {
    "id": 2,
    "name": "Kyoto",
    "country": "Japan",
    "budget_category": "$$$",
    "travel_interests": ["Culture", "Food"],
    "match": 98
  },
  {
    "id": 1,
    "name": "Tokyo",
    "country": "Japan",
    "budget_category": "$$$",
    "travel_interests": ["Food", "Culture", "Adventure"],
    "match": 98
  }
]
```

---

## 6. Testing with cURL Examples

### 1. Login to get JWT Token
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@ferd.com\",\"password\":\"admin123\"}"
```

### 2. Verify Profile with Token
```bash
curl -X GET http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer <PASTE_TOKEN_HERE>"
```

### 3. Create a Destination (201 Created)
```bash
curl -X POST http://localhost:4000/api/destinations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <PASTE_TOKEN_HERE>" \
  -d '{
    "name": "Reykjavik",
    "country": "Iceland",
    "tagline": "Land of Fire & Ice",
    "overview": "A stunning northern paradise.",
    "budget_category": "$$$"
  }'
```

### 4. Update a Destination (PUT - 200 OK)
```bash
curl -X PUT http://localhost:4000/api/destinations/8 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <PASTE_TOKEN_HERE>" \
  -d '{"rating": 5.0}'
```

### 5. Delete a Destination (DELETE - 200 OK)
```bash
curl -X DELETE http://localhost:4000/api/destinations/8 \
  -H "Authorization: Bearer <PASTE_TOKEN_HERE>"
```
