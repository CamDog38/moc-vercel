import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/prisma'
import { createClient } from '@/util/supabase/api'
import { ensureUserExists } from '@/util/auth-helpers'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createClient(req, res)
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Ensure user exists in the database
    let dbUser;
    try {
      dbUser = await ensureUserExists(user);
    } catch (error) {
      console.error('Failed to ensure user exists:', error);
      return res.status(401).json({ error: 'Failed to verify user in database' });
    }

    const { id, rateId } = req.query

    if (!id || !rateId || typeof id !== 'string' || typeof rateId !== 'string') {
      return res.status(400).json({ error: 'Invalid officer ID or rate ID' })
    }

    // Check if the rate exists and belongs to the specified officer
    const existingRate = await prisma.serviceRate.findFirst({
      where: { 
        id: rateId,
        officerId: id
      }
    })

    if (!existingRate) {
      return res.status(404).json({ error: 'Service rate not found for this officer' })
    }

    // Check permissions
    if (dbUser.role !== 'SUPER_ADMIN' && dbUser.role !== 'ADMIN') {
      // Marriage officers can only manage their own rates
      const officer = await prisma.marriageOfficer.findUnique({
        where: { userId: user.id }
      })

      if (!officer || officer.id !== id) {
        return res.status(403).json({ error: 'Not authorized to manage rates for this officer' })
      }
    }

    switch (req.method) {
      case 'GET':
        return res.status(200).json(existingRate)

      case 'PUT':
        const { serviceType, baseRate, travelRatePerKm } = req.body

        if (!serviceType || baseRate === undefined) {
          return res.status(400).json({ error: 'Missing required fields' })
        }

        const updatedRate = await prisma.serviceRate.update({
          where: { id: rateId },
          data: {
            serviceType,
            baseRate: typeof baseRate === 'string' ? parseFloat(baseRate) : baseRate,
            travelRatePerKm: travelRatePerKm 
              ? (typeof travelRatePerKm === 'string' ? parseFloat(travelRatePerKm) : travelRatePerKm)
              : null,
          }
        })

        return res.status(200).json(updatedRate)

      case 'DELETE':
        await prisma.serviceRate.delete({
          where: { id: rateId }
        })

        return res.status(200).json({ message: 'Service rate deleted successfully' })

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
        return res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  } catch (error) {
    console.error('Officer Rate API Error:', error)
    return res.status(500).json({ 
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    })
  }
}