import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';
import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  HeadingLevel, 
  Spacing, 
  AlignmentType 
} from 'docx';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const supabase = createClient(req, res);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: String(id) },
      include: {
        form: {
          include: {
            formSections: {
              include: {
                fields: true
              },
              orderBy: {
                order: 'asc'
              }
            }
          }
        },
        submissions: {
          select: {
            data: true
          }
        }
      }
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Generate document content
    const doc = generateDocumentContent(booking);
    
    // Generate the .docx file buffer
    const buffer = await Packer.toBuffer(doc);

    // Set headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=booking-${booking.id}.docx`);

    // Send the document
    res.send(buffer);
  } catch (error) {
    console.error('Error generating document:', error);
    res.status(500).json({ error: 'Failed to generate document' });
  }
}

function generateDocumentContent(booking: any) {
  // Create sections array for the document
  const sections: Paragraph[] = [];

  // Add document title
  sections.push(
    new Paragraph({
      text: "Booking Details",
      heading: HeadingLevel.TITLE,
      spacing: {
        after: 400,
      },
      alignment: AlignmentType.CENTER,
    })
  );

  // Add booking summary section
  sections.push(
    new Paragraph({
      text: "Booking Summary",
      heading: HeadingLevel.HEADING_1,
      spacing: {
        before: 400,
        after: 200,
      },
    })
  );

  // Add basic info with improved formatting
  const basicInfo = [
    { label: "Booking ID", value: booking.id },
    { label: "Name", value: booking.name || booking.mappedData?.name || booking.mappedData?.['Full Name'] || 'N/A' },
    { label: "Email", value: booking.email || booking.mappedData?.email || booking.mappedData?.['Email Address'] || 'N/A' },
    { label: "Phone", value: booking.phone || booking.mappedData?.phone || booking.mappedData?.['Phone Number'] || booking.mappedData?.mobile || 'N/A' },
    { label: "Form", value: booking.form.name },
    { label: "Date", value: new Date(booking.createdAt).toLocaleDateString() },
  ];

  basicInfo.forEach(({ label, value }) => {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${label}: `,
            bold: true,
          }),
          new TextRun({
            text: String(value),
          }),
        ],
        spacing: {
          before: 100,
          after: 100,
        },
      })
    );
  });

  // Check for submission data
  let submissionData = booking.submissions?.[0]?.data || {};
  
  // Parse JSON if needed
  if (typeof submissionData === 'string') {
    try {
      submissionData = JSON.parse(submissionData);
    } catch (e) {
      console.error('Failed to parse submission data JSON:', e);
    }
  }
  
  // Add Form Details section header
  sections.push(
    new Paragraph({
      text: "Form Details",
      heading: HeadingLevel.HEADING_1,
      spacing: {
        before: 400,
        after: 200,
      },
    })
  );

  // Check for Form System 2.0 enhanced data with sections
  if (submissionData._formSections && Object.keys(submissionData._formSections).length > 0) {
    // Process enhanced form data with sections
    const formSections = submissionData._formSections;
    
    // Sort sections by order if available
    const sortedSectionIds = Object.keys(formSections).sort((a, b) => {
      return (formSections[a].order || 0) - (formSections[b].order || 0);
    });
    
    // Process each section
    sortedSectionIds.forEach(sectionId => {
      const section = formSections[sectionId];
      const sectionFields = section.fields || [];
      
      // Add section title
      sections.push(
        new Paragraph({
          text: section.title,
          heading: HeadingLevel.HEADING_2,
          spacing: {
            before: 300,
            after: 200,
          },
        })
      );
      
      // Add section description if available
      if (section.description) {
        sections.push(
          new Paragraph({
            text: section.description,
            spacing: {
              before: 100,
              after: 200,
            },
          })
        );
      }
      
      // Add fields from the section
      sectionFields.forEach((fieldId: string) => {
        // Get field metadata if available
        const fieldMeta = submissionData[`_meta_${fieldId}`] || {};
        const fieldLabel = fieldMeta.label || formatFieldId(fieldId);
        const fieldValue = submissionData[fieldId];
        
        if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
          sections.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `${fieldLabel}: `,
                  bold: true,
                }),
                new TextRun({
                  text: formatFieldValue(fieldValue),
                }),
              ],
              spacing: {
                before: 100,
                after: 100,
              },
            })
          );
        }
      });
    });
  } 
  // If no enhanced form data, fall back to legacy form sections
  else if (booking.form.formSections && booking.form.formSections.length > 0) {
    booking.form.formSections.forEach((section: any) => {
      // Add section title
      sections.push(
        new Paragraph({
          text: section.title,
          heading: HeadingLevel.HEADING_2,
          spacing: {
            before: 300,
            after: 200,
          },
        })
      );

      // Add section description if available
      if (section.description) {
        sections.push(
          new Paragraph({
            text: section.description,
            spacing: {
              before: 100,
              after: 200,
            },
          })
        );
      }

      // Add fields from the section
      section.fields.forEach((field: any) => {
        const fieldValue = submissionData[field.id] || booking.mappedData?.[field.label] || 'N/A';
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${field.label}: `,
                bold: true,
              }),
              new TextRun({
                text: formatFieldValue(fieldValue),
              }),
            ],
            spacing: {
              before: 100,
              after: 100,
            },
          })
        );
      });
    });
  }
  // If no form sections at all, add mapped data directly
  else {
    // Add mapped data section if there's additional data
    const additionalMappedData = booking.mappedData ? 
      Object.entries(booking.mappedData).filter(([key]) => 
        !['name', 'email', 'phone', 'Full Name', 'Email Address', 'Phone Number'].includes(key)
      ) : [];

    if (additionalMappedData.length > 0) {
      additionalMappedData.forEach(([key, value]) => {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${key}: `,
                bold: true,
              }),
              new TextRun({
                text: formatFieldValue(value),
              }),
            ],
            spacing: {
              before: 100,
              after: 100,
            },
          })
        );
      });
    }
  }

  // Create and return the document
  return new Document({
    sections: [{
      properties: {},
      children: sections,
    }],
  });
}

// Helper function to format field IDs into readable labels
function formatFieldId(id: string): string {
  return id
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/_/g, ' ') // Replace underscores with spaces
    .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
    .replace(/Cm9ts\w+/g, '') // Remove cryptic IDs like Cm9ts...
    .trim();
}

// Helper function to format field values
function formatFieldValue(value: any): string {
  if (value === null || value === undefined || value === '') {
    return 'N/A';
  }
  
  // Format arrays
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : 'N/A';
  }
  
  // Format objects
  if (typeof value === 'object' && !Array.isArray(value)) {
    try {
      return JSON.stringify(value, null, 2);
    } catch (e) {
      return 'Complex object';
    }
  }
  
  // Format booleans
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  
  return String(value);
}