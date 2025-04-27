/**
 * Debug logging utility for development and troubleshooting
 */

interface DebugLogData {
  [key: string]: any;
}

interface DebugLogEntry {
  type: string;
  data: DebugLogData;
  timestamp?: string;
}

/**
 * A simple in-memory debug logging utility
 */
class DebugLogger {
  private logs: DebugLogEntry[] = [];
  private maxLogs = 1000;

  /**
   * Create a new debug log entry
   */
  async create(entry: DebugLogEntry): Promise<DebugLogEntry> {
    // Add timestamp if not provided
    const completeEntry = {
      ...entry,
      timestamp: entry.timestamp || new Date().toISOString()
    };

    // Add to in-memory logs
    this.logs.unshift(completeEntry);
    
    // Limit size of logs array
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Log to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEBUG LOG] ${completeEntry.type}:`, 
        JSON.stringify(completeEntry.data, null, 2).substring(0, 500) + 
        (JSON.stringify(completeEntry.data, null, 2).length > 500 ? '...' : '')
      );
    }

    return completeEntry;
  }

  /**
   * Get recent logs, optionally filtered by type
   */
  async getLogs(type?: string, limit = 100): Promise<DebugLogEntry[]> {
    let result = this.logs;
    
    if (type) {
      result = result.filter(log => log.type === type);
    }
    
    return result.slice(0, limit);
  }

  /**
   * Clear all logs
   */
  async clearLogs(): Promise<void> {
    this.logs = [];
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEBUG LOG] Logs cleared');
    }
  }
}

// Export a singleton instance
export const debugLog = new DebugLogger(); 