import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { withCors } from '@/util/cors';
import * as logger from '@/util/logger';
import { createClient } from '@/util/supabase/api';

// Helper function to convert string to camelCase
function toCamelCase(str: string): string {
  return str
    .split(/[\s-_]+/)
    .map((word, index) => 
      index === 0 
        ? word.toLowerCase() 
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join('');
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Check authentication
    const supabase = createClient(req, res);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get form sessions with filtering options
    if (req.method === 'GET') {
      const { formId, days = '7', status } = req.query;
      
      // Calculate date threshold (default to 7 days ago)
      const daysAgo = parseInt(days as string) || 7;
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - daysAgo);
      
      // Build the where clause based on filters
      const where: any = {
        startedAt: {
          gte: dateThreshold
        }
      };
      
      // Apply status filter
      if (status === 'viewed') {
        where.status = 'VIEWED';
        where.completedAt = null;
      } else if (status === 'submitted') {
        where.status = 'COMPLETED';
      } else if (status === 'started') {
        where.status = 'STARTED';
        where.completedAt = null;
      } else {
        // Default to show all statuses (viewed, started, and completed)
        where.status = {
          in: ['VIEWED', 'STARTED', 'COMPLETED']
        };
      };
      
      if (formId) {
        where.formId = String(formId);
      }
      
      // Include all abandoned sessions, even if contact info is missing
      // We've improved the form session tracking to better capture contact info
      
      const abandonedSessions = await prisma.formSession.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        include: {
          form: {
            select: {
              id: true,
              name: true,
              type: true,
              formSections: {
                include: {
                  fields: {
                    orderBy: {
                      order: 'asc'
                    }
                  }
                },
                orderBy: {
                  order: 'asc'
                }
              }
            }
          }
        }
      });
      
      // Process form sessions to include field mappings
      const processedSessions = abandonedSessions.map(session => {
        // Create a mapping of field IDs to their labels
        const fieldMap = new Map();
        if (session.form?.formSections) {
          session.form.formSections.forEach(section => {
            section.fields.forEach(field => {
              const camelCaseLabel = toCamelCase(field.label);
              fieldMap.set(field.id, {
                label: field.label,
                variableName: camelCaseLabel,
                sectionTitle: section.title,
                type: field.type,
                isConditional: field.conditionalLogic ? true : false,
                conditionalLogic: field.conditionalLogic
              });
            });
          });
        }
        
        // Extract form data with readable field names
        const formData = session.data as Record<string, any>;
        const readableData: Record<string, any> = {};
        
        // Process form data to convert field IDs to readable names
        if (formData && typeof formData === 'object') {
          Object.entries(formData).forEach(([key, value]) => {
            const fieldInfo = fieldMap.get(key);
            if (fieldInfo) {
              readableData[fieldInfo.variableName] = {
                value,
                label: fieldInfo.label,
                sectionTitle: fieldInfo.sectionTitle,
                type: fieldInfo.type,
                isConditional: fieldInfo.isConditional || false,
                conditionalLogic: fieldInfo.conditionalLogic
              };
            } else {
              // Keep original key if no mapping found
              readableData[key] = { value, label: key };
            }
          });
        }
        
        return {
          ...session,
          readableData,
          fieldMap: Object.fromEntries(fieldMap)
        };
      });
      
      // Get some stats
      const totalViewed = await prisma.formSession.count({
        where: {
          status: 'VIEWED',
          completedAt: null,
          startedAt: {
            gte: dateThreshold
          },
          ...(formId ? { formId: String(formId) } : {})
        }
      });
      
      const totalStarted = await prisma.formSession.count({
        where: {
          status: 'STARTED',
          completedAt: null,
          startedAt: {
            gte: dateThreshold
          },
          ...(formId ? { formId: String(formId) } : {})
        }
      });
      
      const totalAbandoned = totalViewed + totalStarted;
      
      const totalCompleted = await prisma.formSession.count({
        where: {
          status: 'COMPLETED',
          startedAt: {
            gte: dateThreshold
          },
          ...(formId ? { formId: String(formId) } : {})
        }
      });
      
      // Calculate abandonment rates
      const abandonmentRate = totalAbandoned + totalCompleted > 0 
        ? (totalAbandoned / (totalAbandoned + totalCompleted) * 100).toFixed(2)
        : '0';
        
      const viewToCompletionRate = totalViewed + totalCompleted > 0
        ? (totalCompleted / (totalViewed + totalCompleted) * 100).toFixed(2)
        : '0';
        
      const startToCompletionRate = totalStarted + totalCompleted > 0
        ? (totalCompleted / (totalStarted + totalCompleted) * 100).toFixed(2)
        : '0';
      
      return res.status(200).json({
        sessions: processedSessions,
        stats: {
          totalViewed,
          totalStarted,
          totalAbandoned,
          totalCompleted,
          abandonmentRate: `${abandonmentRate}%`,
          viewToCompletionRate: `${viewToCompletionRate}%`,
          startToCompletionRate: `${startToCompletionRate}%`,
          period: `${daysAgo} days`
        }
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    logger.error('Error in abandoned form sessions API', 'form-sessions', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withCors(handler, {
  allowedMethods: ['GET', 'OPTIONS'],
  maxAge: 86400, // 24 hours
});