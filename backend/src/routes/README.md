# IntellMeet API Routes

## Auth Routes — /api/v1/auth

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| POST | /signup | No | Register new user |
| POST | /login | No | Login with email/password |
| POST | /logout | Yes | Logout current user |
| POST | /refresh-token | No (cookie) | Get new access token |
| GET | /me | Yes | Get current user |
| POST | /change-password | Yes | Change password |

## User Routes — /api/v1/users

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| GET | /profile | Yes | Get user profile |
| PUT | /profile | Yes | Update user profile |
| GET | /admin/stats | Yes (admin only) | Get admin statistics |