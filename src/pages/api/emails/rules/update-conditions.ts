import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';
import { debugLog } from '@/lib/debug-log';

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

  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return updateRuleConditions(req, res, user.id);
}

async function updateRuleConditions(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  try {
    const { updates } = req.body;

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    debugLog('Updating rule conditions:', updates);

    // Process each update
    const results = await Promise.all(
      updates.map(async (update) => {
        const { ruleId, conditions } = update;
        
        if (!ruleId || !conditions) {
          return { 
            ruleId, 
            success: false, 
            error: 'Missing ruleId or conditions' 
          };
        }

        try {
          // Verify the rule exists and belongs to the user
          const rule = await prisma.emailRule.findFirst({
            where: {
              id: ruleId,
              userId,
            },
          });

          if (!rule) {
            return { 
              ruleId, 
              success: false, 
              error: 'Rule not found or access denied' 
            };
          }

          // Prepare conditions for saving
          let conditionsToSave;
          
          if (typeof conditions === 'string') {
            // If it's already a string, use it directly
            conditionsToSave = conditions;
          } else if (Array.isArray(conditions)) {
            // If it's an array, stringify it
            conditionsToSave = JSON.stringify(conditions);
          } else if (typeof conditions === 'object') {
            // If it's an object (but not an array), stringify it
            conditionsToSave = JSON.stringify(conditions);
          } else {
            // Default to empty array
            conditionsToSave = '[]';
          }

          // Update the rule
          await prisma.emailRule.update({
            where: { id: ruleId },
            data: { conditions: conditionsToSave },
          });

          return { ruleId, success: true };
        } catch (error) {
          debugLog(`Error updating rule ${ruleId}:`, error);
          return { 
            ruleId, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          };
        }
      })
    );

    // Check if all updates were successful
    const allSuccessful = results.every(result => result.success);
    const statusCode = allSuccessful ? 200 : 207; // 207 Multi-Status for partial success

    return res.status(statusCode).json({
      success: allSuccessful,
      results
    });
  } catch (error) {
    debugLog('Error in updateRuleConditions:', error);
    return res.status(500).json({ 
      error: 'Failed to update rule conditions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}