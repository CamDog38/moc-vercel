import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/prisma'
import { createClient } from '@/util/supabase/api'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[USER-ROLE] Method not allowed:', req.method);
    }
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabase = createClient(req, res)
  
  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[USER-ROLE] Processing request');
    }
    
    // Verify the request is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.error('[USER-ROLE] Auth error:', authError)
      return res.status(401).json({ error: 'Unauthorized', details: authError.message })
    }
    
    if (!user) {
      console.error('[USER-ROLE] No user found in auth context')
      return res.status(401).json({ error: 'Unauthorized - No user found' })
    }

    // Get userId from query or use authenticated user's ID
    const userId = req.query.userId as string || user.id
    
    // Only allow admins to query other users' roles
    if (userId !== user.id) {
      // Check if the authenticated user is an admin
      const authUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { role: true }
      })
      
      if (!authUser || (authUser.role !== 'ADMIN' && authUser.role !== 'SUPER_ADMIN')) {
        console.error('[USER-ROLE] Unauthorized role query attempt')
        return res.status(403).json({ error: 'Forbidden - Cannot query other users\'s role' })
      }
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('[USER-ROLE] Fetching role for user:', userId);
    }
    
    // Fetch user role
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })

    if (!dbUser) {
      console.error('[USER-ROLE] User not found:', userId)
      return res.status(404).json({ error: 'User not found' })
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('[USER-ROLE] User role found:', dbUser.role);
    }
    return res.status(200).json({ role: dbUser.role })
  } catch (error: any) {
    console.error('[USER-ROLE] Error:', error)
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message,
      code: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}