import { PrismaClient } from '@prisma/client'

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
//
// Learn more: 
// https://pris.ly/d/help/next-js-best-practices

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

// Parse connection pool settings from environment variables with more conservative defaults
const connectionLimit = process.env.DATABASE_CONNECTION_LIMIT 
  ? parseInt(process.env.DATABASE_CONNECTION_LIMIT, 10) 
  : 5; // Reduced from 15 to prevent connection exhaustion

const poolTimeout = process.env.DATABASE_POOL_TIMEOUT 
  ? parseInt(process.env.DATABASE_POOL_TIMEOUT, 10) 
  : 30; // Seconds before timing out when getting a connection

// Configure Prisma's connection pool through environment variables
process.env.DATABASE_CONNECTION_LIMIT = connectionLimit.toString();
process.env.DATABASE_POOL_TIMEOUT = poolTimeout.toString();

// Create a new PrismaClient with appropriate settings
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query', 'error', 'warn'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  })

// Set up disconnection handler for development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  
  // Properly close the connection pool when Node.js exits
  process.on('beforeExit', async () => {
    await prisma.$disconnect();
  });
}

// Add a helper function to handle database errors
export const handlePrismaError = (error: any) => {
  console.error('Prisma error:', error);
  
  // Check for connection pool timeout errors
  if (error.code === 'P2024') {
    return {
      status: 503,
      message: 'Database connection timeout. The server is experiencing high load. Please try again later.',
      code: error.code
    };
  }
  
  // Handle other common Prisma errors
  if (error.code === 'P2002') {
    return {
      status: 409,
      message: 'A record with this information already exists.',
      code: error.code
    };
  }
  
  if (error.code === 'P2025') {
    return {
      status: 404,
      message: 'Record not found.',
      code: error.code
    };
  }
  
  // Default error response
  return {
    status: 500,
    message: error.message || 'An unexpected database error occurred.',
    code: error.code || 'UNKNOWN'
  };
};

// Export as default and named
export default prisma