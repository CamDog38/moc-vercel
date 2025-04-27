/**
 * Base Repository
 * 
 * This file contains the base repository class with shared functionality.
 */

import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export class BaseRepository {
  // Common utility methods can be added here
}
