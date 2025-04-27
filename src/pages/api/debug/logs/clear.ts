import { NextApiRequest, NextApiResponse } from 'next';
import { clearApiLogs } from '.';
import { createClient } from '@/util/supabase/api';

// In-memory log storage is imported from the main logs endpoint
// This will clear the logs stored there

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check authentication
    const supabase = createClient(req, res);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Use the exported clearApiLogs function
    await clearApiLogs();
    
    // Set cache control headers to prevent caching
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    return res.status(200).json({ success: true, message: 'Logs cleared successfully' });
  } catch (error) {
    console.error('Error clearing logs:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
