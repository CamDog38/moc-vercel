import { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';
import { promisify } from 'util';
import prisma from '@/lib/prisma';
import { cors } from '@/util/cors';

const execAsync = promisify(exec);

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Apply CORS
  await cors(req, res);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Run migrations
    const { stdout, stderr } = await execAsync('npx prisma migrate deploy');
    
    // Run seed script if needed
    // const seedResult = await execAsync('npx prisma db seed');
    
    return res.status(200).json({ 
      success: true, 
      message: 'Database tables regenerated successfully',
      details: { stdout, stderr }
    });
  } catch (error) {
    console.error('Error regenerating database:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to regenerate database tables',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

export default handler;