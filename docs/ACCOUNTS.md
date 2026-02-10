# Account System Design (Phase 3 — Design Only)

This document describes the planned user authentication system. It will be implemented in Phase 3.

## Authentication Method

JWT (JSON Web Tokens) using `python-jose` for token handling and `passlib` with bcrypt for password hashing.

## Registration Flow

1. User submits email, password, and name
2. Server validates input (email format, password requirements)
3. Password is hashed using bcrypt (12 rounds)
4. User record is created in the `users` table
5. JWT access token is generated and returned

## Login Flow

1. User submits email and password
2. Server looks up user by email
3. Password is verified against stored bcrypt hash
4. On success, JWT access token is generated and returned
5. On failure, generic "invalid credentials" error is returned

## Token Details

- **Algorithm:** HS256
- **Expiration:** 24 hours
- **Payload:** `{ sub: user_id, email: user_email, exp: expiration_timestamp }`
- **Storage (development):** `Authorization: Bearer <token>` header
- **Storage (production):** httpOnly secure cookie

## Protected Routes

All `/api/recipes/*` endpoints will require a valid JWT:
- `GET /api/recipes` — list user's recipes
- `POST /api/recipes` — save a new recipe
- `GET /api/recipes/:id` — get recipe details
- `PUT /api/recipes/:id` — update a recipe
- `DELETE /api/recipes/:id` — delete a recipe

Public endpoints (no auth required):
- `GET /api/health`
- `POST /api/parse-recipe`
- `POST /api/calculate-nutrition`

## Password Requirements

- Minimum 8 characters
- No maximum length enforced (bcrypt handles up to 72 bytes)

## Session Management

- Tokens expire after 24 hours
- No refresh token mechanism in initial implementation
- Users re-authenticate after token expiry
