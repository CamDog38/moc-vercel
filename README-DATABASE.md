# Database Migration Status

## Important: Database Migration Timeout Issue

This project experienced a migration timeout issue with Prisma during deployment to Supabase (db.yoqvvanbajywjiynmczx.supabase.co) on May 14, 2025. The issue occurred with migration `20250412000001_add_stable_field_id`, which attempted to:

1. Add the `stableId` TEXT field to the `FormField` table
2. Generate UUID values for all existing records using `gen_random_uuid()::text`
3. Make the column required with `ALTER COLUMN "stableId" SET NOT NULL`
4. Create a unique constraint and index on the field

**Current Status:**
- A database restore was performed
- The schema is up-to-date (the `FormField` table contains both `stableId` and `inUseByRules` fields)
- The fields function correctly in the application
- The `_prisma_migrations` table may show some migrations as not applied, despite the schema being correct

## For Developers

### Local Development

When working locally:
- If running `npx prisma migrate status` shows unapplied migrations but the schema appears correct, this is expected
- You can use `npx prisma studio` to verify that the schema is correct (check that `FormField` has `stableId` and `inUseByRules` fields)
- The Prisma version is 5.22.0, with an update available to 6.6.0 (this is unrelated to the migration issue)

### Deployments

For all deployments:
- **IMPORTANT:** Set `PRISMA_SKIP_MIGRATIONS=true` in environment variables
- This will prevent deployment timeouts due to migrations
- Any future schema changes should be applied manually through database console or using `npx prisma db push` with a direct connection

### Creating New Migrations

When creating new migrations:
1. Split complex operations into multiple migrations
2. For large tables, use batched updates instead of single UPDATE statements
3. Test migrations locally before deploying
4. Document the migration in MIGRATIONS.md

## Complete Migration Documentation

For complete documentation of all migrations including the database restore event, see [MIGRATIONS.md](./MIGRATIONS.md). This file contains detailed information about all 33 migrations, the specific tables and fields added in each, and the database restore event.

## Migrations Backup

A backup of all migrations is maintained at `~/prisma_migrations_backup/` for reference. 