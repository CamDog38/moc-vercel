import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/prisma'
import { createClient } from '@/util/supabase/api'

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Form ID is required' })
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    // Initialize Supabase client for auth
    const supabase = createClient(req, res);
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('API: Auth error:', authError);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get form fields
    const form = await prisma.form.findUnique({
      where: { id },
      include: {
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
    });

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    // Extract all fields from all sections and convert labels to camelCase with section prefixes
    const fields = form.formSections.flatMap(section => {
      // Create a sanitized section name for use in variable prefixes
      const sectionPrefix = toCamelCase(section.title);
      
      return section.fields.map(field => {
        // Convert label to camelCase
        const camelCaseLabel = toCamelCase(field.label);
        
        // If field has a mapping, convert it to camelCase as well
        const camelCaseMapping = field.mapping ? toCamelCase(field.mapping) : undefined;
        
        // Create section-prefixed variable name
        const sectionPrefixedName = `${sectionPrefix}${camelCaseLabel.charAt(0).toUpperCase()}${camelCaseLabel.slice(1)}`;
        
        return {
          id: sectionPrefixedName, // Use section-prefixed name as the ID
          originalId: field.id, // Keep the original ID for reference
          label: field.label,
          variableName: sectionPrefixedName,
          mapping: camelCaseMapping ? `${sectionPrefix}${camelCaseMapping.charAt(0).toUpperCase()}${camelCaseMapping.slice(1)}` : undefined,
          type: field.type,
          sectionTitle: section.title,
          sectionPrefix: sectionPrefix // Include the section prefix for reference
        };
      });
    });

    return res.status(200).json(fields);
  } catch (error) {
    console.error('API: Error fetching form fields:', error);
    return res.status(500).json({ error: 'Failed to fetch form fields' });
  }
}