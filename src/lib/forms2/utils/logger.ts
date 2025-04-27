/**
 * Logger utility for Form System 2.0
 * Provides consistent logging across the Form System 2.0 codebase
 */

import { addApiLog as originalAddApiLog } from '@/pages/api/debug/logs';

/**
 * Log levels
 */
export type LogLevel = 'info' | 'error' | 'success' | 'warning';

/**
 * Log categories
 */
export type LogCategory = 'forms' | 'emails' | 'other';

/**
 * Logger interface
 */
export const logger = {
  /**
   * Log an informational message
   * @param message Message to log
   * @param category Log category
   */
  info: (message: string, category: LogCategory = 'other') => {
    try {
      originalAddApiLog(message, 'info', category);
    } catch (error) {
      console.info(`[Forms2] [${category}] ${message}`);
    }
  },

  /**
   * Log an error message
   * @param message Message to log
   * @param category Log category
   */
  error: (message: string, category: LogCategory = 'other') => {
    try {
      originalAddApiLog(message, 'error', category);
    } catch (error) {
      console.error(`[Forms2] [${category}] ${message}`);
    }
  },

  /**
   * Log a success message
   * @param message Message to log
   * @param category Log category
   */
  success: (message: string, category: LogCategory = 'other') => {
    try {
      originalAddApiLog(message, 'success', category);
    } catch (error) {
      console.log(`[Forms2] [${category}] ${message}`);
    }
  },

  /**
   * Log a warning message
   * @param message Message to log
   * @param category Log category
   */
  warning: (message: string, category: LogCategory = 'other') => {
    try {
      originalAddApiLog(message, 'warning', category);
    } catch (error) {
      console.warn(`[Forms2] [${category}] ${message}`);
    }
  }
};
