import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/util/supabase/api';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check authentication
  const supabase = createClient(req, res);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Import the logging function
    const { addApiLog, apiLogs } = require('./logs');
    
    // Add a test log entry
    const timestamp = new Date().toISOString();
    const testMessage = `API logs test entry at ${timestamp}`;
    addApiLog(testMessage, 'info', 'emails');
    
    // Add a success log entry
    addApiLog('API logs success test', 'success', 'emails');
    
    // Add an error log entry
    addApiLog('API logs error test', 'error', 'emails');
    
    // Check if the logs array exists and has entries
    const logsExist = Array.isArray(apiLogs) && apiLogs.length > 0;
    
    // Check if our test entries are in the logs
    const testEntryFound = logsExist && apiLogs.some(log => log.message === testMessage);
    
    // Return diagnostic information
    return res.status(200).json({
      success: true,
      message: 'API logs test completed',
      diagnostics: {
        logsExist,
        testEntryFound,
        logsCount: logsExist ? apiLogs.length : 0,
        recentLogs: logsExist ? apiLogs.slice(0, 5) : [],
        timestamp
      }
    });
  } catch (error) {
    console.error('Error testing API logs:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to test API logs',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}