/**
 * API endpoint for migrating forms to use stable IDs
 * 
 * This endpoint allows administrators to migrate existing forms to use stable IDs.
 * It can be used to add stable IDs to forms that were created before
 * the stable ID system was implemented.
 * 
 * Requires admin authentication to use.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/util/supabase/api';
import { migrateFormToStableIds, migrateAllFormsToStableIds } from '@/lib/forms2/utils/migrateToStableIds';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check authentication
    const supabase = createClient(req);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is an admin
    const { data: profile } = await supabase
      .from('User')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden - Admin access required' });
    }

    // Get parameters from request body
    const { formId, dryRun = false } = req.body;

    // If formId is provided, migrate a single form
    if (formId) {
      const result = await migrateFormToStableIds(formId, dryRun);
      return res.status(200).json(result);
    }

    // Otherwise, migrate all forms
    const results = await migrateAllFormsToStableIds(dryRun);
    return res.status(200).json(results);
  } catch (error) {
    console.error('Error migrating forms to stable IDs:', error);
    return res.status(500).json({ 
      error: 'Failed to migrate forms', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}