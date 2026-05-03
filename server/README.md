# Nuvora Server

Real-time backend for Nuvora social platform.

## Setup

```bash
cp config.env.example config.env
# Fill in CONN_STRING and SECRET_KEY (both required)
npm install
npm run dev      # development with nodemon
npm run seed     # populate test users
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT_NUMBER` | Server port (default: 3000) | Yes |
| `CONN_STRING` | MongoDB connection string | Yes |
| `SECRET_KEY` | JWT signing secret (64+ chars) | Yes |
| `JWT_EXPIRES_IN` | Token expiry (default: 7d) | No |
| `CLOUDINARY_*` | Image upload credentials | No |
| `CLIENT_URL` | Frontend URL for CORS | Yes |

## Scripts

- `npm run dev` — Start with nodemon (auto-restart on changes)
- `npm run seed` — Seed 10 test users
- `npm test` — Placeholder

## Security

- `helmet.js` — HTTP security headers
- `express-rate-limit` — 20 auth requests / 15min; 200 API requests / min
- JWT generic error messages (no user enumeration)
- `SECRET_KEY` validated at startup (won't start if missing)
- Member-validated chat/message routes