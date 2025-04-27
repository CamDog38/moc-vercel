import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/prisma'
import { createClient } from '@/util/supabase/api'
import { ensureUserExists } from '@/util/auth-helpers'

// Helper function to create a field with minimal data to avoid timeouts
async function createField(field: any, sectionId: string) {
  try {
    // Safely handle conditionalLogic - ensure it's valid JSON or null
    let conditionalLogicValue = null;
    if (field.conditionalLogic) {
      try {
        // If it's a string, try to parse it
        if (typeof field.conditionalLogic === 'string') {
          conditionalLogicValue = JSON.parse(field.conditionalLogic);
        } else {
          // Otherwise use it directly
          conditionalLogicValue = field.conditionalLogic;
        }
      } catch (parseError) {
        conditionalLogicValue = null;
      }
    }

    // Create field with minimal required data
    return await prisma.formField.create({
      data: {
        sectionId: sectionId,
        type: field.type,
        label: field.label,
        placeholder: field.placeholder || '',
        helpText: field.helpText || '',
        required: field.required || false,
        options: field.options || null,
        validation: field.validation || null,
        order: field.order,
        excludeTime: field.excludeTime || false,
        mapping: field.mapping || null,
        conditionalLogic: conditionalLogicValue,
      },
      // Only select essential fields to return
      select: {
        id: true,
      }
    });
  } catch (fieldError) {
    // Try again without conditionalLogic
    try {
      return await prisma.formField.create({
        data: {
          sectionId: sectionId,
          type: field.type,
          label: field.label,
          placeholder: field.placeholder || '',
          helpText: field.helpText || '',
          required: field.required || false,
          options: field.options || null,
          validation: field.validation || null,
          order: field.order,
          excludeTime: field.excludeTime || false,
          mapping: field.mapping || null,
        },
        select: {
          id: true,
        }
      });
    } catch (fallbackError) {
      // Return null if field creation fails
      return null;
    }
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  
  // Only allow POST requests for duplication
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }

  try {
    // Initialize Supabase client for auth
    const supabase = createClient(req, res)
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      return res.status(401).json({ error: 'Authentication failed: ' + authError.message })
    }
    
    if (!user) {
      return res.status(401).json({ error: 'No authenticated user found' })
    }

    // Ensure user exists in the database
    let dbUser;
    try {
      dbUser = await ensureUserExists(user);
    } catch (error) {
      return res.status(401).json({ error: 'Failed to verify user in database' });
    }

    // Get only the basic form info first
    const basicFormInfo = await prisma.form.findUnique({
      where: { id: id as string },
      select: {
        name: true,
        description: true,
        type: true,
        userId: true,
        isMultiPage: true,
        isActive: true,
      }
    });

    if (!basicFormInfo) {
      return res.status(404).json({ error: 'Form not found' });
    }

    // Check if user has permission to duplicate this form
    if (basicFormInfo.userId !== user.id && dbUser.role !== 'ADMIN' && dbUser.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'You do not have permission to duplicate this form' });
    }
    
    // Create the new form first
    const newForm = await prisma.form.create({
      data: {
        name: `Copy of ${basicFormInfo.name}`,
        description: basicFormInfo.description,
        type: basicFormInfo.type,
        userId: user.id, // Assign to the current user
        isMultiPage: basicFormInfo.isMultiPage,
        isActive: basicFormInfo.isActive,
      },
    });

    // Get sections separately to avoid loading all data at once
    const sections = await prisma.formSection.findMany({
      where: { formId: id as string },
      orderBy: { order: 'asc' },
      select: {
        title: true,
        description: true,
        order: true,
        isPage: true,
        id: true,
      }
    });

    // Create sections one by one
    for (const section of sections) {
      try {
        const newSection = await prisma.formSection.create({
          data: {
            formId: newForm.id,
            title: section.title,
            description: section.description || '',
            order: section.order,
            isPage: section.isPage,
          },
        });
        
        // Get fields for this section
        const fields = await prisma.formField.findMany({
          where: { sectionId: section.id },
          orderBy: { order: 'asc' },
        });
        
        // Create fields in parallel but in small batches
        const BATCH_SIZE = 5;
        for (let i = 0; i < fields.length; i += BATCH_SIZE) {
          const batch = fields.slice(i, i + BATCH_SIZE);
          await Promise.all(batch.map(field => createField(field, newSection.id)));
        }
      } catch (sectionError) {
        // Continue with other sections
      }
    }

    return res.status(201).json(newForm);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to duplicate form: ' + (error as Error).message });
  }
}