# Prisma Configuration

## Important: Migration Handling

This project uses Prisma ORM with PostgreSQL. Due to a migration timeout issue (see detailed documentation in `/MIGRATIONS.md`), we've implemented the following approach:

### For Production Deployments (Vercel)

- **Environment Setting**: `PRISMA_SKIP_MIGRATIONS=true`
- This setting prevents Prisma from attempting to run migrations during deployment
- The database schema is already up-to-date with all migrations

### For Local Development

- Normal Prisma commands will work as expected
- If `prisma migrate status` shows migrations as not applied, but the schema is correct (check with `prisma studio`), this is expected
- The `FormField` table already contains both `stableId` and `inUseByRules` fields

### For Future Schema Changes

1. Create migrations locally as usual with `npx prisma migrate dev`
2. Test thoroughly in development
3. When deploying:
   - Keep `PRISMA_SKIP_MIGRATIONS=true` in Vercel
   - Apply changes manually through:
     - Direct database connection: `npx prisma db push`
     - Database console in Supabase
4. Document any schema changes in `/MIGRATIONS.md`

### Current Prisma Version

- Version: 5.22.0 (Update available to 6.6.0)
- When upgrading, follow the guide at https://pris.ly/d/major-version-upgrade

## Reference Documentation

For complete documentation of migrations and database status, see:
- `/MIGRATIONS.md` - Detailed history of all migrations
- `/README-DATABASE.md` - Summary and guidance for developers 