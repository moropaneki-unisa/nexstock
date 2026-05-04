# InventoryHub Product-Ready MVP

This is a cleaned full-stack InventoryHub MVP:

- NestJS API
- Prisma + PostgreSQL
- JWT auth with refresh cookies
- Product CRUD
- Inventory adjustments and logs
- API keys and public `/api/v1/products` endpoints
- Webhooks without requiring Redis locally
- Next.js App Router frontend
- shadcn-style local UI components

## Requirements

- Node.js 20+
- Online PostgreSQL database, such as Neon, Supabase, Railway, Render, or RDS

Docker and Redis are not required for this MVP build.

## 1. Install dependencies

From the project root:

```bash
npm install
```

## 2. Configure API environment

Copy:

```bash
cp apps/api/.env.example apps/api/.env
```

Set your online database URL:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
JWT_ACCESS_SECRET="replace-with-a-long-random-string"
JWT_REFRESH_SECRET="replace-with-another-long-random-string"
FRONTEND_URL="http://localhost:3000"
PORT=4000
```

## 3. Push schema to your database

For development with an online database:

```bash
cd apps/api
npx prisma generate
npx prisma db push
```

For production migrations, use:

```bash
npx prisma migrate dev --name init
npx prisma migrate deploy
```

## 4. Run the API

```bash
cd apps/api
npm run start:dev
```

API runs at:

```txt
http://localhost:4000/api
```

Health check:

```txt
GET http://localhost:4000/api/health
```

## 5. Run the frontend

Copy:

```bash
cp apps/web/.env.example apps/web/.env.local
```

Then:

```bash
cd apps/web
npm run dev
```

Frontend runs at:

```txt
http://localhost:3000
```

## Important API routes

```txt
POST   /api/auth/signup
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/dashboard
GET    /api/products
POST   /api/products
GET    /api/products/:id
PATCH  /api/products/:id
DELETE /api/products/:id
POST   /api/products/:id/adjust
GET    /api/inventory/logs
GET    /api/api-keys
POST   /api/api-keys
DELETE /api/api-keys/:id
GET    /api/webhooks
POST   /api/webhooks
DELETE /api/webhooks/:id
POST   /api/webhooks/:id/test
GET    /api/v1/products
POST   /api/v1/products
```

## Notes

- Webhooks deliver directly from the API process in this MVP so Redis is not required.
- OAuth integration modules are intentionally omitted from this build until the core frontend and API are stable.
- All tenant-owned records are scoped by `organizationId` server-side.
