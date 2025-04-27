// This is a utility script to help apply CORS to all API routes

/**
 * How to use this utility:
 * 
 * 1. Import the withCors middleware in your API route:
 *    import { withCors } from '@/util/cors';
 * 
 * 2. Modify your API handler to be a named function instead of default export:
 *    async function handler(req: NextApiRequest, res: NextApiResponse) {
 *      // Your handler code
 *    }
 * 
 * 3. Export the handler wrapped with withCors:
 *    export default withCors(handler, {
 *      // Optional custom options
 *      allowedMethods: ['GET', 'POST', 'OPTIONS'],
 *      maxAge: 86400, // 24 hours
 *    });
 * 
 * Default options will be applied if not specified:
 * - allowedOrigins: From NEXT_PUBLIC_ALLOWED_ORIGINS environment variable
 * - allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH']
 * - allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
 * - maxAge: 3600 (1 hour)
 * - allowCredentials: true
 */

/**
 * Example implementation:
 * 
 * import { NextApiRequest, NextApiResponse } from 'next';
 * import { withCors } from '@/util/cors';
 * 
 * async function handler(req: NextApiRequest, res: NextApiResponse) {
 *   // Your API logic here
 *   res.status(200).json({ message: 'Success' });
 * }
 * 
 * export default withCors(handler);
 */

/**
 * For routes that need specific CORS settings:
 * 
 * export default withCors(handler, {
 *   allowedOrigins: ['https://specific-domain.com'],
 *   allowedMethods: ['GET', 'OPTIONS'],
 *   maxAge: 7200, // 2 hours
 * });
 */