/**
 * Form System 2.0 API - Field Options Endpoint
 * 
 * GET: Get options for a field
 * POST: Add options to a field
 * PUT: Update options for a field
 * DELETE: Delete options from a field
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/util/supabase/server';
import { prisma } from '@/lib/forms2/repositories/baseRepository';
import * as logger from '@/util/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Create a Supabase client authenticated with the user's session cookie
  const supabase = createServerSupabaseClient({ req, res });
  
  // Get the user from the session
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = user.id;
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Field ID is required' });
  }

  try {
    // First, get the field to ensure it exists and the user has access
    const field = await prisma.formField.findUnique({
      where: { id },
      include: {
        section: {
          include: {
            form: true
          }
        }
      }
    });

    if (!field) {
      return res.status(404).json({ error: 'Field not found' });
    }

    // Check if the user has access to the form
    if (field.section.form.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // GET - Get options for a field
    if (req.method === 'GET') {
      // Parse the options from the field
      let options = [];
      try {
        if (field.options) {
          // If options is a string, parse it
          if (typeof field.options === 'string') {
            options = JSON.parse(field.options);
          } else {
            // Otherwise, it's already an object
            options = field.options as any[];
          }
        }
      } catch (error) {
        console.error('Error parsing field options:', error);
        logger.error('Error parsing field options:', 'forms', error);
        options = [];
      }

      return res.status(200).json({
        success: true,
        options
      });
    }

    // POST - Add options to a field
    if (req.method === 'POST') {
      const { options: newOptions } = req.body;

      if (!newOptions || !Array.isArray(newOptions)) {
        return res.status(400).json({ error: 'Options must be an array' });
      }

      // Get current options
      let currentOptions = [];
      try {
        if (field.options) {
          // If options is a string, parse it
          if (typeof field.options === 'string') {
            currentOptions = JSON.parse(field.options);
          } else {
            // Otherwise, it's already an object
            currentOptions = field.options as any[];
          }
        }
      } catch (error) {
        console.error('Error parsing field options:', error);
        logger.error('Error parsing field options:', 'forms', error);
        currentOptions = [];
      }

      // Ensure currentOptions is an array
      if (!Array.isArray(currentOptions)) {
        currentOptions = [];
      }

      // Add new options
      const updatedOptions = [...currentOptions, ...newOptions];

      // Update the field with the new options
      const updatedField = await prisma.formField.update({
        where: { id },
        data: {
          options: JSON.stringify(updatedOptions)
        }
      });

      return res.status(200).json({
        success: true,
        message: 'Options added successfully',
        options: updatedOptions
      });
    }

    // PUT - Update options for a field
    if (req.method === 'PUT') {
      const { options: updatedOptions } = req.body;

      if (!updatedOptions || !Array.isArray(updatedOptions)) {
        return res.status(400).json({ error: 'Options must be an array' });
      }

      // Update the field with the new options
      const updatedField = await prisma.formField.update({
        where: { id },
        data: {
          options: JSON.stringify(updatedOptions)
        }
      });

      return res.status(200).json({
        success: true,
        message: 'Options updated successfully',
        options: updatedOptions
      });
    }

    // DELETE - Delete options from a field
    if (req.method === 'DELETE') {
      const { optionIds } = req.body;

      if (!optionIds || !Array.isArray(optionIds)) {
        return res.status(400).json({ error: 'Option IDs must be an array' });
      }

      // Get current options
      let currentOptions = [];
      try {
        if (field.options) {
          // If options is a string, parse it
          if (typeof field.options === 'string') {
            currentOptions = JSON.parse(field.options);
          } else {
            // Otherwise, it's already an object
            currentOptions = field.options as any[];
          }
        }
      } catch (error) {
        console.error('Error parsing field options:', error);
        logger.error('Error parsing field options:', 'forms', error);
        currentOptions = [];
      }

      // Ensure currentOptions is an array
      if (!Array.isArray(currentOptions)) {
        currentOptions = [];
      }

      // Filter out the options to delete
      const filteredOptions = currentOptions.filter(option => 
        !optionIds.includes(option.id)
      );

      // Update the field with the filtered options
      const updatedField = await prisma.formField.update({
        where: { id },
        data: {
          options: JSON.stringify(filteredOptions)
        }
      });

      return res.status(200).json({
        success: true,
        message: 'Options deleted successfully',
        options: filteredOptions
      });
    }

    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in field options API:', error);
    logger.error('Error in field options API:', 'forms', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
