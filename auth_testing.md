# Auth Testing Playbook — Libroteca AI

## Auth types
1. Emergent Google OAuth (session_token cookie + `user_sessions` collection) — pre-existing
2. Email/password JWT auth (access_token 15min + refresh_token 7d, httpOnly cookies) — NEW

## Test credentials
- Email: test@libroteca.ai
- Password: Test1234!
(seeded on backend startup, 15 welcome credits)

## Step 1: MongoDB Verification
```
mongosh
use test_database
db.users.findOne({email: "test@libroteca.ai"})
```
Verify: password_hash starts with `$2b$`, indexes on users.email (unique), login_attempts.identifier, password_reset_tokens.expires_at (TTL).

## Step 2: API Testing
```
curl -c cookies.txt -X POST http://localhost:8001/api/auth/login -H "Content-Type: application/json" -d '{"email":"test@libroteca.ai","password":"Test1234!"}'
cat cookies.txt
curl -b cookies.txt http://localhost:8001/api/auth/me
```
Login returns user object + sets access_token & refresh_token cookies. `/me` returns the same user.

## Endpoints
- POST /api/auth/register {name, email, password} → user + cookies, 15 welcome credits
- POST /api/auth/login {email, password} → user + cookies; brute force: 5 fails = 15 min lockout (429)
- POST /api/auth/refresh → new access_token cookie from refresh_token
- POST /api/auth/logout → clears session_token + access_token + refresh_token
- GET /api/auth/me → works with JWT cookie, Bearer JWT, or Google session token
- POST /api/auth/forgot-password {email} → generic message; reset link logged to backend console
- POST /api/auth/reset-password {token, password}

## Frontend
- /login — tabs Accedi/Registrati + Google button + "Password dimenticata?"
- /reset-password?token=... — reset form
- ProtectedRoute redirects to /login
