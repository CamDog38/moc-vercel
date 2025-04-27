import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/util/supabase/api';

// Define log entry type
interface LogEntry {
  id?: string;
  timestamp: string;
  message: string;
  type: 'info' | 'error' | 'success';
  source: 'leads' | 'bookings' | 'emails' | 'forms' | 'other';
}

// In-memory store for logs (will be reset on server restart)
let apiLogs: LogEntry[] = [];

// Maximum number of logs to keep in memory
const MAX_LOGS = 2000; // Increased from 1000 since we're not using DB storage

// Function to add a log entry - fully in-memory, no database operations
export async function addApiLog(message: string, type: 'info' | 'error' | 'success', source: 'leads' | 'bookings' | 'emails' | 'forms' | 'other') {
  const timestamp = new Date().toISOString();
  const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
  
  const logEntry: LogEntry = {
    id,
    timestamp,
    message,
    type,
    source
  };
  
  // Add to in-memory logs
  apiLogs.unshift(logEntry); // Add to the beginning
  
  // Keep only the most recent logs in memory
  if (apiLogs.length > MAX_LOGS) {
    apiLogs = apiLogs.slice(0, MAX_LOGS);
  }
  
  // Also log to console for server-side visibility
  const consoleMethod = type === 'error' ? console.error : type === 'success' ? console.log : console.info;
  consoleMethod(`[${source.toUpperCase()}] ${message}`);
  
  return logEntry;
}

// Synchronous version for cases where we can't await
export function addApiLogSync(message: string, type: 'info' | 'error' | 'success', source: 'leads' | 'bookings' | 'emails' | 'forms' | 'other') {
  const timestamp = new Date().toISOString();
  const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
  
  const logEntry: LogEntry = {
    id,
    timestamp,
    message,
    type,
    source
  };
  
  // Add to in-memory logs
  apiLogs.unshift(logEntry);
  
  // Keep only the most recent logs
  if (apiLogs.length > MAX_LOGS) {
    apiLogs = apiLogs.slice(0, MAX_LOGS);
  }
  
  // Also log to console for server-side visibility
  const consoleMethod = type === 'error' ? console.error : type === 'success' ? console.log : console.info;
  consoleMethod(`[${source.toUpperCase()}] ${message}`);
  
  return logEntry;
}

// Function to clear all logs (in-memory only)
export async function clearApiLogs() {
  apiLogs = [];
  console.info('[OTHER] Logs cleared (in-memory only)');
  return addApiLogSync('Logs cleared', 'info', 'other');
}

// API handler
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Set cache control headers to prevent caching
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Get source filter from query
    const { source, limit = '100' } = req.query;
    const limitNum = parseInt(limit as string, 10) || 100;
    
    // Get logs from in-memory store only
    let logs = [...apiLogs];
    
    // Filter by source if requested
    if (source) {
      logs = logs.filter(log => log.source === source);
    }
    
    // Limit the number of logs returned
    logs = logs.slice(0, limitNum);
    
    // Return the logs
    return res.status(200).json({ logs });
  } catch (error) {
    console.error('Error in logs API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
