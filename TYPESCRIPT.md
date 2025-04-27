# TypeScript Checking

This project uses TypeScript with strict type checking to ensure code quality and prevent common errors.

## Automated Type Checking

We use Husky and lint-staged to automatically run TypeScript checks before each commit. This helps catch type errors early in the development process.

### How it works

1. When you attempt to commit changes, Husky triggers a pre-commit hook
2. The pre-commit hook runs lint-staged
3. lint-staged runs TypeScript type checking on all staged .ts and .tsx files
4. If any type errors are found, the commit is blocked until you fix them

## Manual Type Checking

You can also run type checking manually:

```bash
npm run type-check
```

This will check all TypeScript files in the project using a stricter configuration defined in `tsconfig.check.json`.

## Common TypeScript Errors and How to Fix Them

### String vs Enum Type Errors

One common error is using string literals where enum values are expected. For example:

```typescript
// Incorrect
const template = {
  type: 'INVOICE'  // Error: Type 'string' is not assignable to type 'EmailTemplateType'
};

// Correct
import { EmailTemplateType } from '@prisma/client';

const template = {
  type: EmailTemplateType.INVOICE
};
```

Always import and use the appropriate enum types from `@prisma/client` when working with database models.

### Type Safety with Optional Fields

When working with optional fields, use proper null checking:

```typescript
// Incorrect
function processUser(user: { name?: string }) {
  const nameLength = user.name.length; // Error: Object is possibly undefined
}

// Correct
function processUser(user: { name?: string }) {
  const nameLength = user.name?.length || 0;
}
```

## Additional Resources

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Prisma Client TypeScript Guide](https://www.prisma.io/docs/concepts/components/prisma-client/advanced-type-safety)