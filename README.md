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
GET    /api/products/import-logs
GET    /api/products/import-logs/:logId
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

7. **Signup auth persistence**
   - Frontend signup no longer persists auth state before OTP verification.
   - `signup()` now returns the signup response directly and leaves auth persistence to `login()` and `verifyEmail()`.
   - This prevents pre-verification users from being written into the persisted auth store.

8. **Prisma product layout models**
   - Added `ProductType` and `ProductTypeField` models to `apps/api/prisma/schema.prisma`.
   - Added organization relations for `productTypes` and `productTypeFields`.
   - Prisma can now generate typed clients for the layout tables created by the existing migration.

9. **Product import/export frontend**
   - Added product toolbar actions for CSV export, XLSX export, and CSV/XLSX import.
   - Export uses the authenticated backend file endpoints and downloads the returned file.
   - Import uploads a spreadsheet through `POST /api/products/import`, shows success/warning/error toasts, and refreshes the products list after completion.

10. **Product import logs and backend mapping support**
   - Added `ProductImportLog` migration for organization-scoped import history.
   - Product imports now create/update persistent logs with file name, status, totals, created/updated/skipped counts, row errors, mapping, and metadata.
   - Added `GET /api/products/import-logs` and `GET /api/products/import-logs/:logId`.
   - `POST /api/products/import` now accepts an optional `mapping` payload so spreadsheet columns can be mapped to product fields.
   - Inventory logs created during imports now reference the import log ID.

11. **Imports CRUD pages and product action dropdown**
   - The sidebar `Imports` item now opens `/imports`, a previous-imports dashboard focused on import history, totals, logs, review status, and links to import details.
   - Added `/imports/new` as the dedicated setup page for selecting layout context and exporting templates/schema.
   - Added `/imports/new/mapping` as the dedicated mapping/import page for uploading CSV/XLSX, reading headers, mapping columns, and starting the import.
   - Added `/imports/[id]` as the import detail/read page for one import log, including status, row totals, mapping used, metadata, and row-level errors.
   - Changed the Products page primary action into a dropdown with `Add new product` and `Import products` options.
   - The `Import products` option now routes users to `/imports/new`.

12. **Import layout selection and field rules**
   - Added a Product layout selector to `/imports/new`; it defaults to `None` until the user selects a layout.
   - `POST /api/products/import` now accepts `productTypeId` and applies only the selected layout's fields and rules to imported products.
   - Selected layout metadata is saved on imported products and import logs.
   - Required layout fields are enforced during import.
   - Select layout fields treat `none` as an empty/default UI value and only save a value when the spreadsheet value matches a configured select option.

13. **Backend-aligned import template exports**
   - Selecting a layout on `/imports/new` regenerates the import field set to include that layout's custom fields.
   - CSV and XLSX exports are explicitly importable by the current backend.
   - CSV export is an upload-ready product import template.
   - XLSX export keeps the importable product data in the first worksheet because the backend reads only the first worksheet; additional `Field Guide`, `Select Options`, and `Import Info` sheets are reference-only and ignored by import.
   - JSON export is renamed/treated as a schema/reference file only, not an importable upload format.
   - Template schema `dataType` values now use only backend-supported layout field type names: `text`, `richtext`, `number`, `decimal`, `currency`, `attachment`, `images`, `lookup`, `boolean`, `select`, and `date`.
   - Core product fields that are not layout fields, such as `priceCurrency` and `costCurrency`, are documented as `text` with their currency-code rules in `importFormat` and notes.
   - Stock fields use the backend `number` datatype label, with notes explaining they are rounded to whole numbers by the import service.
   - Templates include backend-supported core fields: price currency, cost, cost currency, exchange rate, quantity, low stock level, status, images, and selected layout fields.
   - Added `xlsx` to the web app dependencies for client-side XLSX template generation.

14. **Dedicated import mapping page**
   - `/imports/new` is now a setup page only: choose layout context and export CSV/XLSX/JSON schema templates.
   - `/imports/new` was cleaned up into fixed-height setup cards to reduce layout jumping and unused space.
   - The setup page now presents a stable 3-step flow: choose layout, download template, and continue to mapping.
   - `/imports/new/mapping` is now the dedicated mapping page.
   - The mapping page handles CSV/XLSX file selection, first-row/first-worksheet header detection, visual column-to-field mapping, auto-match, required-field validation, backend mapping preview, and Start Import.
   - Every mapping select defaults to `None`; users explicitly map spreadsheet columns to NexStock fields.
   - The mapping page still submits the backend-supported `file`, `mapping`, and `productTypeId` multipart payload to `POST /api/products/import`, so the backend contract is unchanged.

15. **Product supplier section overflow cleanup**
   - Fixed supplier/costing UI overflow in product create/update forms.
   - Supplier costing cards now use responsive `auto-fit` columns instead of forcing four fixed columns that can collide with the right summary panel.
   - Supplier links now render as compact cards on smaller layouts and as a horizontally scroll-safe table on large layouts.
   - Added `min-w-0`, truncation, and bounded dialog scrolling so long supplier names, SKUs, and rows do not push into or hide behind the summary panel.

## Current known follow-up items

- Add import preview/validation before final upload.
- Verify or complete purchase order receiving UI.
- Verify or complete API key management UI.
- Verify or complete webhook management UI.
- After pulling `main-v2`, run `npm install`, `npm run prisma:generate -w @nexstock/api`, and `npm run migrate -w @nexstock/api` before testing layouts/import logs.
