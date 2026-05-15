# NexStock — Connect. Manage. Grow.

NexStock is a SaaS platform for product catalog management, inventory operations,
integrations, APIs, and webhooks.

## Stack

- **Frontend:** Next.js 15 (App Router), Tailwind CSS, shadcn-style local UI
- **Backend:** NestJS 10
- **Database:** Prisma + PostgreSQL
- **Auth:** JWT access tokens + httpOnly refresh cookies + email OTP verification
- **Email:** Resend
- **Storage:** Cloudinary (product images)
- **Billing:** Paystack

## Requirements

- Node.js 20+
- Hosted PostgreSQL (Neon, Supabase, Railway, Render, or RDS)

Docker and Redis are not required.

## 1. Install dependencies

From the project root:

```bash
npm install
```

## 2. Configure API environment

```bash
cp apps/api/.env.example apps/api/.env
```

Required environment variables (production fails fast if missing):

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
JWT_ACCESS_SECRET="replace-with-a-long-random-string"
JWT_REFRESH_SECRET="replace-with-another-long-random-string"
```

Recommended for full functionality:

```env
RESEND_API_KEY="re_..."
EMAIL_FROM="onboarding@nexstock.co.za"
FRONTEND_URL="http://localhost:3000"
CLOUDINARY_URL="cloudinary://..."
PAYSTACK_SECRET_KEY="sk_..."
CORS_ORIGINS="https://nexstock.co.za,https://www.nexstock.co.za,http://localhost:3000"
PORT=4000
```

## 3. Apply database schema

```bash
cd apps/api
npx prisma generate
npx prisma migrate deploy   # production
# or
npx prisma db push          # development
```

## 4. Run the API

```bash
cd apps/api
npm run start:dev
```

API base URL: `http://localhost:4000/api`
Health check: `GET http://localhost:4000/api/health`

## 5. Run the frontend

```bash
cp apps/web/.env.example apps/web/.env.local
cd apps/web
npm run dev
```

Frontend: `http://localhost:3000`

## Build for production

```bash
npm run build      # builds api and web
npm run migrate    # applies pending Prisma migrations
```

## Important API routes

```txt
POST   /api/auth/signup
POST   /api/auth/login
POST   /api/auth/verify-email
POST   /api/auth/resend-otp
POST   /api/auth/logout

GET    /api/dashboard
GET    /api/organization
PATCH  /api/organization

GET    /api/products
POST   /api/products
GET    /api/products/export?format=csv
GET    /api/products/export?format=xlsx
POST   /api/products/import
GET    /api/products/types
POST   /api/products/types
GET    /api/products/:id
PATCH  /api/products/:id
DELETE /api/products/:id
POST   /api/products/:id/adjust
POST   /api/products/:id/upload-image

GET    /api/inventory/logs

GET    /api/api-keys
POST   /api/api-keys
DELETE /api/api-keys/:id

GET    /api/webhooks
POST   /api/webhooks
DELETE /api/webhooks/:id
POST   /api/webhooks/:id/test

POST   /api/billing/paystack/initialize
GET    /api/billing/paystack/verify/:reference

GET    /api/v1/products             # public, API key authenticated
POST   /api/v1/products             # public, API key authenticated
PATCH  /api/v1/products/:id         # public, API key authenticated
POST   /api/v1/products/:id/adjust  # public, API key authenticated
```

## Security notes

- All tenant-owned records are scoped by `organizationId` server-side.
- Auth endpoints are rate limited (in-memory) per-IP.
- Global exception filter hides stack traces and standardizes error shape.
- Security headers (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
  are applied to every response.
- Webhook deliveries are signed with HMAC-SHA256 in `x-nexstock-signature`.
- API keys are hashed at rest; the secret is shown only at creation time.

## main-v2 functionality fixes

These changes were applied directly to the `main-v2` branch.

### 2026-05-15

1. **Product layout database tables**
   - Added Prisma migration `20260515120000_add_product_layout_tables`.
   - Creates `ProductType` and `ProductTypeField` tables used by product layout/custom field logic.
   - Adds organization-scoped unique/index constraints and cascade foreign keys.
   - This fixes runtime failures for `/api/products/types` when the layout tables do not exist.

2. **Product import/export routes**
   - Added authenticated product export route: `GET /api/products/export?format=csv|xlsx`.
   - Added authenticated spreadsheet import route: `POST /api/products/import` with multipart `file` upload.
   - These routes expose the existing `ProductsImportExportService` logic for CSV/XLSX product operations.

3. **Public API inventory adjustment**
   - Added `POST /api/v1/products/:id/adjust`.
   - Uses the existing API key guard and `products:write` scope.
   - Defaults adjustment source to `public_api` when no source is supplied.
   - Enables external systems to adjust stock through API keys.

4. **Product status persistence**
   - Updated product PATCH handling so web bulk actions such as `Set active` and `Set draft` can persist product status.
   - Follow-up cleanup moved status persistence into `ProductsService.update()` so the normal service update flow now saves status.
   - Simplified `ProductsController.update()` back to a single service call after moving status logic into the service.

5. **Dashboard inventory valuation**
   - Dashboard now returns both `inventoryRetailValue` and `inventoryCostValue`.
   - `inventoryValue` remains available as a backward-compatible alias for retail value.
   - Cost value uses `convertedCost`, then `cost`, then falls back to selling price when no cost is available.
   - Dashboard cards now display retail value and cost value together so the backend valuation work is visible in the UI.

6. **Purchase order receiving stock accuracy**
   - Receiving now rejects line IDs that do not belong to the selected purchase order instead of silently ignoring them.
   - Receiving now tracks product quantity inside the transaction per product so inventory logs keep correct before/after quantities even when multiple lines reference the same product.
   - Existing protections remain in place for duplicate submitted lines, negative received quantities, receiving beyond ordered quantity, and cancelled purchase orders.

## Current known follow-up items

- Signup frontend auth persistence cleanup is still recommended: signup should return verification state only and should not attempt to persist auth data until OTP verification succeeds.
- After pulling `main-v2`, run `npm install`, `npm run prisma:generate -w @nexstock/api`, and `npm run migrate -w @nexstock/api` before testing layouts.
