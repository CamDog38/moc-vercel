import { Prisma, PrismaClient } from '@prisma/client';
import prisma from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a custom invoice ID in the format: YYMM-NNNN-XX
 * Where:
 * - YYMM: Year and month (e.g., 2503 for March 2025)
 * - NNNN: Auto-incremented number
 * - XX: Officer initials
 */
export async function generateCustomInvoiceId(officerId: string | null): Promise<string> {
  try {
    // Get the current date for YYMM part
    const now = new Date();
    const year = now.getFullYear().toString().slice(2); // Get last 2 digits of year
    const month = (now.getMonth() + 1).toString().padStart(2, '0'); // Month is 0-indexed
    const datePart = `${year}${month}`;
    
    // Get the last invoice number from settings
    const lastInvoiceNumberSetting = await prisma.$queryRaw`
      SELECT * FROM "SystemSettings" WHERE key = 'lastInvoiceNumber' LIMIT 1
    `;
    
    // Default to 1000 if not found
    let lastInvoiceNumber = 1000;
    if (Array.isArray(lastInvoiceNumberSetting) && lastInvoiceNumberSetting.length > 0) {
      lastInvoiceNumber = parseInt(lastInvoiceNumberSetting[0].value, 10) || 1000;
    }
    
    // Increment the number
    const newInvoiceNumber = lastInvoiceNumber + 1;
    
    // Update the setting with the new number
    await prisma.$executeRaw`
      INSERT INTO "SystemSettings" (id, key, value, description, "createdAt", "updatedAt")
      VALUES (${uuidv4()}, 'lastInvoiceNumber', ${newInvoiceNumber.toString()}, 'The last used invoice number for auto-increment', NOW(), NOW())
      ON CONFLICT (key) 
      DO UPDATE SET value = ${newInvoiceNumber.toString()}, "updatedAt" = NOW()
    `;
    
    // Format the number part with leading zeros
    const numberPart = newInvoiceNumber.toString().padStart(4, '0');
    
    // Get officer initials if officerId is provided
    let initialsPart = 'XX'; // Default if no officer
    if (officerId) {
      const officer = await prisma.$queryRaw`
        SELECT initials FROM "MarriageOfficer" WHERE id = ${officerId} LIMIT 1
      `;
      
      if (Array.isArray(officer) && officer.length > 0 && officer[0].initials) {
        initialsPart = officer[0].initials;
      }
    }
    
    // Combine all parts to form the invoice ID
    return `${datePart}-${numberPart}-${initialsPart}`;
  } catch (error) {
    console.error('Error generating custom invoice ID:', error);
    // Return a fallback ID in case of error
    return `ERR-${Date.now().toString().slice(-8)}`;
  }
}