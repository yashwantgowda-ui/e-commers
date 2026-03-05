# Backend Run Guide

The backend runs on port `5001` by default.

## Requirements

- Node.js installed
- MongoDB available:
  - Local: `mongodb://127.0.0.1:27017/ecomm`
  - Or set `MONGO_URI` in `backend/.env`

## Start Backend

```bash
cd backend
npm.cmd start
```

## Health Checks

- Service health: `http://127.0.0.1:5001/health`
- API test: `http://127.0.0.1:5001/api/test`
- API root: `http://127.0.0.1:5001/api`

`/health` returns DB status too. If DB is down, backend stays up and reports the issue instead of crashing.

## Environment

`backend/.env` example:

```env
PORT=5001
MONGO_URI=mongodb://127.0.0.1:27017/ecomm
JWT_SECRET=change_this_secret
RAZORPAY_KEY_ID=your_key
RAZORPAY_KEY_SECRET=your_secret
ADMIN_MONGO_URI=mongodb://127.0.0.1:27017/ecomm_admin
ADMIN_EMAIL=admin@phonehub.com
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
ADMIN_NAME=Store Admin
```

## Admin APIs

- `POST /api/admin/login`
- `GET /api/admin/me`
- `GET /api/admin/products`
- `POST /api/admin/products`
- `DELETE /api/admin/products/:id`
- `GET /api/admin/summary`
- `GET /api/admin/public-products` (no auth; used by customer dashboard)
