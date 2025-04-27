/**
 * Booking Details API
 * 
 * This API endpoint fetches detailed booking information for both legacy and Form 2.0 bookings
 */

import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Authenticate the user
  const supabase = createClient(req, res);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    console.error('API: Authentication error:', authError);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Get the booking ID from the URL
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Booking ID is required' });
  }

  try {
    // Fetch the booking with all related data
    const booking = await prisma.booking.findUnique({
      where: { id },
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
            id: true,
            data: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        invoices: {
          select: {
            id: true,
            status: true,
            totalAmount: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Log the raw submission data for debugging
    if (booking.submissions && booking.submissions.length > 0) {
      console.log('Raw submission data for booking', booking.id, ':', JSON.stringify(booking.submissions[0].data, null, 2));
    }
    
    // Check if this is a Form 2.0 booking
    const isForm2 = booking.submissions.some(s => s.data && Object.keys(s.data).length > 0);
    
    // Process the booking data based on whether it's a Form 2.0 booking or legacy
    let processedBooking = booking;
    
    if (isForm2) {
      // Get the submission data
      const submissionData = booking.submissions[0]?.data || {};
      
      // For Form 2.0 bookings, we'll create virtual sections based on the data structure
      // First, let's identify if the data has a structured format with sections
      let virtualFormSections: any[] = [];
      
      // Check if the data is already organized in sections
      // Handle the case where data might be a string (JSON) or already an object
      let dataObj: any = {};
      try {
        dataObj = typeof submissionData === 'string' ? JSON.parse(submissionData) : submissionData;
      } catch (error) {
        console.error('Error parsing submission data:', error);
        dataObj = {};
      }
      
      // Safely check if sections exist and are an array
      if (dataObj && typeof dataObj === 'object' && dataObj.sections && Array.isArray(dataObj.sections)) {
        // Data is already organized in sections
        virtualFormSections = dataObj.sections.map((section: any, sectionIndex: number) => ({
          id: `section-${sectionIndex}`,
          title: section.title || `Section ${sectionIndex + 1}`,
          description: section.description || '',
          order: sectionIndex,
          formId: booking.form.id,
          createdAt: new Date(),
          updatedAt: new Date(),
          isPage: false,
          fields: (section.fields || []).map((field: any, fieldIndex: number) => ({
            id: field.id || `field-${sectionIndex}-${fieldIndex}`,
            label: field.label || `Field ${fieldIndex + 1}`,
            type: field.type || 'text',
            order: fieldIndex,
            sectionId: `section-${sectionIndex}`,
            createdAt: new Date(),
            updatedAt: new Date(),
            required: field.required || false,
            placeholder: field.placeholder || null,
            helpText: field.helpText || null,
            excludeTime: false,
            mapping: null,
            conditionalLogic: null,
            stableId: field.id || `field-${sectionIndex}-${fieldIndex}`,
            inUseByRules: false,
            options: field.options || null,
            validation: field.validation || null
          }))
        }));
      } else {
        // Create sections based on the flat data structure
        // First section: Basic information (name, email, phone, etc.)
        const basicInfoFields: any[] = [];
        const otherFields: any[] = [];
        
        // Categorize fields
        Object.entries(dataObj).forEach(([key, value]) => {
          // Skip sections or other complex objects
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            return;
          }
          
          const field = {
            id: key,
            label: key.replace(/([A-Z])/g, ' $1')
              .replace(/_/g, ' ')
              .replace(/^./, (str: string) => str.toUpperCase()),
            type: 'text',
            value: value
          };
          
          // Check if this is a basic info field
          const basicInfoKeys = ['name', 'email', 'phone', 'fullName', 'emailAddress', 'phoneNumber', 'mobile'];
          const isBasicInfo = basicInfoKeys.some(infoKey => 
            key.toLowerCase().includes(infoKey.toLowerCase()));
          
          if (isBasicInfo) {
            basicInfoFields.push(field);
          } else {
            otherFields.push(field);
          }
        });
        
        // Create virtual sections
        if (basicInfoFields.length > 0) {
          virtualFormSections.push({
            id: 'section-basic-info',
            title: 'Basic Information',
            description: 'Contact details and basic information',
            order: 0,
            formId: booking.form.id,
            createdAt: new Date(),
            updatedAt: new Date(),
            isPage: false,
            fields: basicInfoFields.map((field, index) => ({
              id: field.id,
              label: field.label,
              type: field.type,
              order: index,
              sectionId: 'section-basic-info',
              createdAt: new Date(),
              updatedAt: new Date(),
              required: true,
              placeholder: null,
              helpText: null,
              excludeTime: false,
              mapping: null,
              conditionalLogic: null,
              stableId: field.id,
              inUseByRules: false,
              options: null,
              validation: null
            }))
          });
        }
        
        if (otherFields.length > 0) {
          virtualFormSections.push({
            id: 'section-additional-info',
            title: 'Additional Information',
            description: 'Other details provided in the form',
            order: 1,
            formId: booking.form.id,
            createdAt: new Date(),
            updatedAt: new Date(),
            isPage: false,
            fields: otherFields.map((field, index) => ({
              id: field.id,
              label: field.label,
              type: field.type,
              order: index,
              sectionId: 'section-additional-info',
              createdAt: new Date(),
              updatedAt: new Date(),
              required: false,
              placeholder: null,
              helpText: null,
              excludeTime: false,
              mapping: null,
              conditionalLogic: null,
              stableId: field.id,
              inUseByRules: false,
              options: null,
              validation: null
            }))
          });
        }
      }
      
      // If no sections were created, create a default one
      if (virtualFormSections.length === 0) {
        virtualFormSections.push({
          id: 'section-default',
          title: 'Form Submission Data',
          description: 'Data submitted through the form',
          order: 0,
          formId: booking.form.id,
          createdAt: new Date(),
          updatedAt: new Date(),
          isPage: false,
          fields: Object.entries(dataObj).map(([key, value], index) => ({
            id: key,
            label: key.replace(/([A-Z])/g, ' $1')
              .replace(/_/g, ' ')
              .replace(/^./, (str: string) => str.toUpperCase()),
            type: 'text',
            order: index,
            sectionId: 'section-default',
            createdAt: new Date(),
            updatedAt: new Date(),
            required: false,
            placeholder: null,
            helpText: null,
            excludeTime: false,
            mapping: null,
            conditionalLogic: null,
            stableId: key,
            inUseByRules: false,
            options: null,
            validation: null
          }))
        });
      }
      
      // Update the processed booking with virtual form sections using type assertion
      processedBooking = {
        ...booking,
        form: {
          ...booking.form,
          formSections: virtualFormSections as any
        }
      };
    }
    
    console.log(`API: Successfully fetched details for booking ${id}`);
    
    return res.status(200).json(processedBooking);
  } catch (error) {
    console.error('API: Error fetching booking details:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch booking details', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
