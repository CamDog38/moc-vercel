import { NextApiRequest, NextApiResponse } from 'next'
import prisma, { handlePrismaError } from '@/lib/prisma'
import { createClient } from '@/util/supabase/api'
import { addApiLog } from '../debug/logs'

// In-memory cache to prevent duplicate user creation attempts
const processingUsers = new Map<string, Promise<any>>();

// Helper function to clean up the processing map after a request
const cleanupProcessingUser = (userId: string) => {
  setTimeout(() => {
    processingUsers.delete(userId);
  }, 5000); // Remove from map after 5 seconds
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers to allow requests from any origin
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    addApiLog('[CREATE-USER] Method not allowed: ' + req.method, 'error', 'other')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Create a timeout promise to prevent hanging requests
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error('Request timeout'));
    }, 30000); // 30 second timeout (increased from 15)
  });
  
  // Function to retry database operations
  const retryOperation = async <T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 500
  ): Promise<T> => {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        // Only retry on connection errors or timeouts
        if (error.code === 'P2024' || error.message?.includes('timeout')) {
          addApiLog(`[CREATE-USER] Retry attempt ${attempt}/${maxRetries} after error: ${error.message}`, 'info', 'other');
          
          // Wait before retrying with exponential backoff
          if (attempt < maxRetries) {
            const delay = initialDelay * Math.pow(2, attempt - 1);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            throw error; // Throw on last attempt
          }
        } else {
          // For other errors, don't retry
          throw error;
        }
      }
    }
    
    // If we've exhausted all retries
    throw lastError;
  };

  try {
    addApiLog('[CREATE-USER] Processing request', 'info', 'other')
    
    // Validate request body first to fail fast
    if (!req.body) {
      addApiLog('[CREATE-USER] Missing request body', 'error', 'other')
      return res.status(400).json({ error: 'Missing request body' })
    }

    const { id, email } = req.body

    if (!id || !email) {
      addApiLog('[CREATE-USER] Missing required fields: ' + JSON.stringify({ id, email }), 'error', 'other')
      return res.status(400).json({ error: 'Missing required fields' })
    }
    
    // Check if we're already processing this user
    if (processingUsers.has(id)) {
      addApiLog(`[CREATE-USER] Already processing user ${id}, returning existing promise`, 'info', 'other');
      try {
        // Wait for the existing operation to complete
        const result = await processingUsers.get(id);
        return res.status(200).json(result);
      } catch (error: any) {
        // If the existing operation failed, we'll try again (fall through)
        addApiLog(`[CREATE-USER] Previous operation for user ${id} failed: ${error.message}`, 'info', 'other');
        // Remove failed promise from map to allow retry
        processingUsers.delete(id);
      }
    }
    
    // Create a new promise for this user and store it in the map
    const userPromise = (async () => {
      try {
        const supabase = createClient(req, res)
        
        // Verify the request is authenticated with retry
        const authResult = await retryOperation(async () => {
          const authResponse = await Promise.race([supabase.auth.getUser(), timeoutPromise]);
          return authResponse;
        });
        
        // Type assertion for authResult
        const authData = authResult as any;
        const { data, error: authError } = authData;
        const user = data?.user;
        
        if (authError) {
          addApiLog('[CREATE-USER] Auth error: ' + authError.message, 'error', 'other')
          throw new Error(`Unauthorized: ${authError.message}`);
        }
        
        if (!user) {
          addApiLog('[CREATE-USER] No user found in auth context', 'error', 'other')
          throw new Error('Unauthorized - No user found');
        }

        // Verify the authenticated user matches the requested user
        if (user.id !== id) {
          addApiLog('[CREATE-USER] User ID mismatch: ' + JSON.stringify({ authUserId: user.id, requestedId: id }), 'error', 'other')
          throw new Error('Forbidden - User ID mismatch');
        }

        addApiLog('[CREATE-USER] Checking if user exists: ' + id, 'info', 'other')
        
        // Check if user already exists with retry
        const existingUser = await retryOperation(async () => {
          const result = await Promise.race([
            prisma.user.findUnique({ where: { id } }), 
            timeoutPromise
          ]);
          return result;
        });

        if (existingUser) {
          addApiLog('[CREATE-USER] User already exists: ' + id, 'success', 'other')
          return existingUser;
        }

        addApiLog('[CREATE-USER] Creating new user: ' + JSON.stringify({ id, email }), 'info', 'other')
        
        // Check if a user with the same email already exists but with a different ID
        const existingUserWithEmail = await retryOperation(async () => {
          const result = await Promise.race([
            prisma.user.findUnique({ where: { email } }),
            timeoutPromise
          ]);
          return result;
        });

        // Type assertion for existingUserWithEmail to include expected fields
        type UserWithId = { id: string; email: string; [key: string]: any };
        const userWithEmail = existingUserWithEmail as UserWithId | null;

        if (userWithEmail && userWithEmail.id !== id) {
          addApiLog('[CREATE-USER] User with this email already exists but with different ID: ' + 
            JSON.stringify({ email, existingId: userWithEmail.id, newId: id }), 'info', 'other')
          
          // Update the existing user with the new ID from Supabase
          const updatedUser = await retryOperation(async () => {
            const result = await Promise.race([
              prisma.user.update({
                where: { email },
                data: { id }
              }),
              timeoutPromise
            ]);
            return result;
          });
          
          addApiLog('[CREATE-USER] Updated user ID for existing email: ' + email, 'success', 'other')
          return updatedUser;
        }

        // Create new user with retry
        const newUser = await retryOperation(async () => {
          const result = await Promise.race([
            prisma.user.create({
              data: {
                id,
                email,
                role: 'MARRIAGE_OFFICER' // Default role
              }
            }),
            timeoutPromise
          ]);
          return result;
        });

        addApiLog('[CREATE-USER] User created successfully: ' + id, 'success', 'other')
        return newUser;
      } catch (error: any) {
        // Re-throw the error to be caught by the main handler
        throw error;
      } finally {
        // Clean up the processing map
        cleanupProcessingUser(id);
      }
    })();
    
    // Store the promise in the map
    processingUsers.set(id, userPromise);
    
    // Wait for the operation to complete with timeout
    const result = await Promise.race([userPromise, timeoutPromise]);
    return res.status(200).json(result);
  } catch (error: any) {
    // Check if it's a timeout error
    if (error.message === 'Request timeout') {
      addApiLog('[CREATE-USER] Request timed out', 'error', 'other')
      return res.status(504).json({ 
        error: 'Request timed out', 
        message: 'The server took too long to respond. Please try again later.'
      });
    }
    
    // Check for specific error messages we set
    if (error.message?.startsWith('Unauthorized')) {
      return res.status(401).json({ error: error.message });
    }
    
    if (error.message?.startsWith('Forbidden')) {
      return res.status(403).json({ error: error.message });
    }
    
    // Check for Prisma errors
    if (error.code?.startsWith('P')) {
      const errorResponse = handlePrismaError(error);
      addApiLog('[CREATE-USER] Database error: ' + JSON.stringify(errorResponse), 'error', 'other');
      
      return res.status(errorResponse.status).json({ 
        error: errorResponse.message, 
        code: errorResponse.code
      });
    }
    
    addApiLog('[CREATE-USER] Error: ' + error.message, 'error', 'other')
    // Provide more detailed error information
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message,
      code: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}