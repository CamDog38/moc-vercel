import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/util/supabase/api';
import prisma from '@/lib/prisma';

// Define variable categories and their descriptions
const emailVariables: Record<string, Array<{ name: string; description: string }>> = {
  contact: [
    { name: 'firstName', description: 'First name of the client' },
    { name: 'lastName', description: 'Last name of the client' },
    { name: 'fullName', description: 'Full name of the client' },
    { name: 'clientName', description: 'Full name of the client (alternative to fullName)' },
    { name: 'name', description: 'Name of the client (alternative to clientName)' },
    { name: 'email', description: 'Email address of the client' },
    { name: 'phone', description: 'Phone number of the client' },
    { name: 'address', description: 'Street address of the client' },
    { name: 'city', description: 'City of the client' },
    { name: 'state', description: 'State/province of the client' },
    { name: 'zipCode', description: 'Postal/ZIP code of the client' },
    { name: 'country', description: 'Country of the client' },
  ],
  lead: [
    { name: 'leadId', description: 'Unique identifier for the lead (used in booking links)' },
    { name: 'trackingToken', description: 'Tracking token for form submissions' },
    { name: 'timeStamp', description: 'Timestamp of form submission' },
  ],
  booking: [
    { name: 'bookingDate', description: 'Date of the booking' },
    { name: 'bookingTime', description: 'Time of the booking' },
    { name: 'location', description: 'Location of the service' },
    { name: 'bookingLocation', description: 'Location of the booking (alternative to location)' },
    { name: 'venueAddress', description: 'Address of the venue' },
    { name: 'serviceType', description: 'Type of service booked' },
    { name: 'packageName', description: 'Name of the service package' },
  ],
  invoice: [
    { name: 'invoiceNumber', description: 'Unique invoice number' },
    { name: 'totalAmount', description: 'Total amount due' },
    { name: 'status', description: 'Current status of the invoice' },
    { name: 'dueDate', description: 'Due date for payment' },
    { name: 'invoiceLink', description: 'Direct link to view the invoice online' },
  ],
  officer: [
    { name: 'officerName', description: 'Name of the assigned marriage officer' },
    { name: 'officerTitle', description: 'Title of the marriage officer' },
    { name: 'officerPhone', description: 'Contact phone number of the officer' },
  ],
  form: [
    { name: 'formName', description: 'Name of the form submitted' },
    { name: 'submissionDate', description: 'Date when the form was submitted' },
    { name: 'formId', description: 'ID of the form' },
    { name: 'submissionId', description: 'ID of the form submission' },
  ],
  formFields: [] as { name: string; description: string }[],
  // Dynamic form fields will be added based on the form structure
};

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

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the form ID from the query parameters
    const { formId } = req.query;
    
    // Create a copy of the base variables
    const variables = { ...emailVariables };
    
    // If a form ID is provided, fetch the form fields and add them to the variables
    if (formId) {
      // Get the form with its sections and fields
      const form = await prisma.form.findUnique({
        where: { id: formId as string },
        include: {
          formSections: {
            include: {
              fields: true
            }
          }
        }
      });
      
      if (form) {
        // Create a section-based structure for form fields
        const sectionVariables: Record<string, { name: string; description: string }[]> = {};
        
        // Add form fields from each section
        form.formSections.forEach(section => {
          // Create a sanitized section name for use in variable prefixes
          const sectionPrefix = section.title
            .split(/[\s-_]+/)
            .map((word, index) => 
              index === 0 
                ? word.toLowerCase() 
                : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            )
            .join('');
          
          // Initialize the section array if it doesn't exist
          if (!sectionVariables[section.title]) {
            sectionVariables[section.title] = [];
          }
          
          section.fields.forEach(field => {
            // Convert the label to camelCase
            const camelCaseLabel = field.label
              .split(/[\s-_]+/)
              .map((word, index) => 
                index === 0 
                  ? word.toLowerCase() 
                  : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
              )
              .join('');
            
            // Create section-prefixed variable name
            const sectionPrefixedName = `${sectionPrefix}${camelCaseLabel.charAt(0).toUpperCase()}${camelCaseLabel.slice(1)}`;
            
            // Add the section-prefixed variable as the primary variable
            sectionVariables[section.title].push({
              name: sectionPrefixedName,
              description: `${field.label} (${section.title})`
            });
            
            // If the field has a mapping, add that as an alternative with section prefix
            if (field.mapping) {
              // Convert mapping to camelCase if it's not already
              const camelCaseMapping = field.mapping.includes('_') || field.mapping.includes('-')
                ? field.mapping
                    .split(/[\s-_]+/)
                    .map((word, index) => 
                      index === 0 
                        ? word.toLowerCase() 
                        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                    )
                    .join('')
                : field.mapping;
              
              // Create section-prefixed mapping
              const sectionPrefixedMapping = `${sectionPrefix}${camelCaseMapping.charAt(0).toUpperCase()}${camelCaseMapping.slice(1)}`;
              
              // Only add if it's different from the section-prefixed label
              if (sectionPrefixedMapping !== sectionPrefixedName) {
                sectionVariables[section.title].push({
                  name: sectionPrefixedMapping,
                  description: `${field.label} - mapped name (${section.title})`
                });
              }
            }
            
            // Add the field ID with section prefix as a fallback
            sectionVariables[section.title].push({
              name: `${sectionPrefix}${field.id}`,
              description: `${field.label} - ID: ${field.id} (${section.title})`
            });
          });
        });
        
        // Convert the section-based structure to the format expected by the frontend
        // We'll replace the single 'formFields' category with section-specific categories
        Object.entries(sectionVariables).forEach(([sectionTitle, fields]) => {
          // Create a sanitized section name for the category key
          const sectionKey = sectionTitle
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '_');
          
          // Add the section as a new category
          variables[`section_${sectionKey}`] = fields;
        });
        
        // Keep the original formFields array for backward compatibility
        // but populate it with all section variables flattened
        variables.formFields = Object.values(sectionVariables).flat();
      }
    } else {
      // If no specific form ID, add a note about form fields
      variables.formFields = [
        { 
          name: 'fieldId', 
          description: 'Provide a form ID in the request to see specific form fields' 
        }
      ];
    }
    
    // Return the variables
    return res.status(200).json({
      variables,
      usage: {
        syntax: "Use double curly braces to insert variables: {'{'}{'{'}}variableName{'}'}{'}'}",
        example: "Hello {'{'}{'{'}}clientName{'}'}{'}'}, your invoice #{'{'}{'{'}}invoiceNumber{'}'}{'}'}  is ready to view: {'{'}{'{'}}invoiceLink{'}'}{'}'}}",
        note: "Form field variables can be accessed using either the field ID, mapped name, or sanitized label"
      }
    });
  } catch (error) {
    console.error('Error fetching email variables:', error);
    return res.status(500).json({ error: 'Failed to fetch email variables' });
  }
}