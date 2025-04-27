import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { withCors } from '@/util/cors';
import * as logger from '@/util/logger';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Handle POST request to create a new form session
    if (req.method === 'POST') {
      const { formId, data, trackingToken, status } = req.body;

      if (!formId) {
        return res.status(400).json({ error: 'Form ID is required' });
      }

      // Get IP address and user agent
      const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
      const userAgent = req.headers['user-agent'] || null;

      // Extract basic user information if available
      let email = null;
      let name = null;
      let phone = null;

      if (data) {
        // Try to find email field
        email = data.email || 
                data.emailAddress || 
                data.email_address || 
                Object.entries(data).find(([key]) => 
                  key.toLowerCase().includes('email'))?.[1] || null;

        // Try to find name field
        name = data.name || 
               data.fullName || 
               data.full_name || 
               Object.entries(data).find(([key]) => 
                 key.toLowerCase().includes('name') && !key.toLowerCase().includes('email'))?.[1] || null;

        // Try to find phone field
        phone = data.phone || 
                data.phoneNumber || 
                data.phone_number || 
                data.mobile || 
                Object.entries(data).find(([key]) => 
                  key.toLowerCase().includes('phone') || key.toLowerCase().includes('mobile'))?.[1] || null;
                  
        // Deep search for contact info in nested objects
        if (!email || !name || !phone) {
          const deepSearch = (obj: any, searchTerm: string): any => {
            if (!obj || typeof obj !== 'object') return null;
            
            for (const [key, value] of Object.entries(obj)) {
              if (key.toLowerCase().includes(searchTerm) && value && typeof value === 'string') {
                return value;
              } else if (typeof value === 'object') {
                const found = deepSearch(value, searchTerm);
                if (found) return found;
              }
            }
            return null;
          };
          
          if (!email) email = deepSearch(data, 'email');
          if (!name) name = deepSearch(data, 'name');
          if (!phone) phone = deepSearch(data, 'phone') || deepSearch(data, 'mobile');
        }
      }

      // Create a new form session
      const session = await prisma.formSession.create({
        data: {
          formId,
          data: data || {},
          ipAddress: typeof ipAddress === 'string' ? ipAddress : null,
          userAgent: typeof userAgent === 'string' ? userAgent : null,
          trackingToken,
          email,
          name,
          phone,
          status: status || (data && Object.keys(data).length > 0 ? 'STARTED' : 'VIEWED')
        }
      });

      logger.debug('Form session created', 'form-sessions', { sessionId: session.id, formId });
      return res.status(201).json({ sessionId: session.id });
    }

    // Handle PUT request to update a form session
    else if (req.method === 'PUT') {
      const { sessionId, data, status } = req.body;

      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID is required' });
      }

      // First, get the current session to preserve existing data
      const currentSession = await prisma.formSession.findUnique({
        where: { id: sessionId }
      });

      if (!currentSession) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Extract basic user information if available
      let updateData: any = {};
      
      if (data) {
        // Merge new data with existing data
        updateData.data = {
          ...(typeof currentSession.data === 'object' ? currentSession.data : {}),
          ...data
        };
        
        // Try to find email field
        const email = data.email || 
                      data.emailAddress || 
                      data.email_address || 
                      Object.entries(data).find(([key]) => 
                        key.toLowerCase().includes('email'))?.[1] || null;
        if (email) updateData.email = email;

        // Try to find name field
        const name = data.name || 
                     data.fullName || 
                     data.full_name || 
                     Object.entries(data).find(([key]) => 
                       key.toLowerCase().includes('name') && !key.toLowerCase().includes('email'))?.[1] || null;
        if (name) updateData.name = name;

        // Try to find phone field
        const phone = data.phone || 
                      data.phoneNumber || 
                      data.phone_number || 
                      data.mobile || 
                      Object.entries(data).find(([key]) => 
                        key.toLowerCase().includes('phone') || key.toLowerCase().includes('mobile'))?.[1] || null;
        if (phone) updateData.phone = phone;
      }

      // Preserve existing contact info if not in current update
      if (!updateData.email && currentSession.email) {
        updateData.email = currentSession.email;
      }
      
      if (!updateData.name && currentSession.name) {
        updateData.name = currentSession.name;
      }
      
      if (!updateData.phone && currentSession.phone) {
        updateData.phone = currentSession.phone;
      }

      if (status) {
        updateData.status = status;
        
        // If status is COMPLETED, set completedAt timestamp
        if (status === 'COMPLETED') {
          updateData.completedAt = new Date();
        }
      }

      // Update the form session
      const session = await prisma.formSession.update({
        where: { id: sessionId },
        data: updateData
      });

      logger.debug('Form session updated', 'form-sessions', { 
        sessionId: session.id, 
        status: session.status 
      });
      
      return res.status(200).json({ success: true, session });
    }

    // Handle GET request to retrieve form sessions
    else if (req.method === 'GET') {
      const { formId, status, email } = req.query;
      
      const where: any = {};
      
      if (formId) {
        where.formId = String(formId);
      }
      
      if (status) {
        where.status = String(status);
      }
      
      if (email) {
        where.email = String(email);
      }
      
      const sessions = await prisma.formSession.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        include: {
          form: {
            select: {
              name: true,
              type: true
            }
          }
        }
      });
      
      return res.status(200).json(sessions);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    logger.error('Error in form sessions API', 'form-sessions', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withCors(handler, {
  allowedMethods: ['GET', 'POST', 'PUT', 'OPTIONS'],
  maxAge: 86400, // 24 hours
});