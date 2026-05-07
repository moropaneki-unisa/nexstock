# MySQL Migration Guide

This project was originally built using PostgreSQL + Prisma.

The application layer has now been migrated to MySQL compatibility.

## Important

Old PostgreSQL migration SQL files still exist in:

```txt
apps/api/prisma/migrations/
```

These contain PostgreSQL-specific SQL such as:

- CREATE TYPE
- JSONB
- TEXT[]
- PostgreSQL enum syntax

These migrations MUST NOT be executed against MySQL.

---

# Recommended Clean Migration Strategy

## Option 1 (Recommended for MVP)

Delete old migrations and create a fresh MySQL baseline.

```bash
rm -rf apps/api/prisma/migrations
mkdir apps/api/prisma/migrations
```

Then:

```bash
cd apps/api
npx prisma migrate dev --name init_mysql
```

This generates a clean MySQL-compatible baseline migration.

---

# Existing PostgreSQL Data Migration

If you already have PostgreSQL production data:

## Export Data

Use:

```bash
pg_dump
```

or export JSON/CSV snapshots.

## Transform Array Fields

The following PostgreSQL array fields were converted to JSON:

| Old PostgreSQL | New MySQL |
|---|---|
| Product.images | JSON |
| CustomField.options | JSON |
| ApiKey.scopes | JSON |
| Webhook.events | JSON |

These must be converted before import.

---

# MySQL Recommendations

## Recommended Charset

Use:

```sql
utf8mb4
```

## Recommended Collation

```sql
utf8mb4_unicode_ci
```

## Recommended Engine

```sql
InnoDB
```

---

# Production Recommendations

- Use connection pooling
- Enable automated backups
- Enable slow query logging
- Add Redis queue processing for webhook retries
- Add Prisma Accelerate or Proxy for scaling

---

# Verified Compatible Features

- Prisma Client
- NestJS API
- Product CRUD
- Inventory tracking
- JWT auth
- Cloudinary uploads
- Webhooks
- Multi-tenant organization model
