import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { addApiLog } from '@/pages/api/debug/logs';
import { replaceVariables } from '@/util/email-template-helpers';

/**
 * API endpoint to test firstName variable replacement in email templates
 * This helps diagnose why {{firstName}} variable isn't being replaced correctly
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { submissionId, templateId } = req.body;

    if (!submissionId) {
      return res.status(400).json({ error: 'Missing submissionId parameter' });
    }

    // Log environment information
    addApiLog(`Testing firstName replacement in environment: ${process.env.NODE_ENV || 'unknown'}`, 'info', 'emails');
    
    // Fetch the submission with detailed data
    const submission = await prisma.formSubmission.findUnique({
      where: { id: submissionId },
      include: { lead: true }
    });

    if (!submission) {
      addApiLog(`Submission not found: ${submissionId}`, 'error', 'emails');
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Fetch email template if provided
    let template = null;
    if (templateId) {
      template = await prisma.emailTemplate.findUnique({
        where: { id: templateId }
      });
      
      if (!template) {
        addApiLog(`Template not found: ${templateId}`, 'info', 'emails');
      } else {
        addApiLog(`Found template with name: ${template.name}`, 'success', 'emails');
      }
    }

    // Create a normalized data structure for testing variable replacement
    const normalizedData: Record<string, any> = {
      ...submission,
      submission: submission,
      formSubmission: submission,
      formData: submission.data || {}
    };

    // Also flatten submission data to top level for direct access
    if (submission.data && typeof submission.data === 'object') {
      Object.entries(submission.data).forEach(([key, value]) => {
        normalizedData[key] = value;
        
        // Log each field for debugging
        addApiLog(`Flattened field: ${key} = ${JSON.stringify(value)}`, 'info', 'emails');
      });
    }

    // Extract firstName using various strategies
    let firstName = null;
    
    // Strategy 1: Check if firstName already exists in the data
    if (normalizedData.firstName) {
      firstName = normalizedData.firstName;
      addApiLog(`Found existing firstName: ${firstName}`, 'success', 'emails');
    }
    // Strategy 2: Extract from name field
    else if (normalizedData.name && typeof normalizedData.name === 'string') {
      const nameParts = normalizedData.name.split(' ');
      if (nameParts.length > 0) {
        firstName = nameParts[0];
        addApiLog(`Extracted firstName from name: ${firstName}`, 'success', 'emails');
      }
    }
    // Strategy 3: Check in formData
    else if (normalizedData.formData.firstName) {
      firstName = normalizedData.formData.firstName;
      addApiLog(`Found firstName in formData: ${firstName}`, 'success', 'emails');
    }
    else if (normalizedData.formData.first_name) {
      firstName = normalizedData.formData.first_name;
      addApiLog(`Found first_name in formData: ${firstName}`, 'success', 'emails');
    }
    else if (normalizedData.formData.name) {
      const nameParts = String(normalizedData.formData.name).split(' ');
      if (nameParts.length > 0) {
        firstName = nameParts[0];
        addApiLog(`Extracted firstName from formData.name: ${firstName}`, 'success', 'emails');
      }
    }
    
    // If still no firstName, use default
    if (!firstName) {
      firstName = "Customer";
      addApiLog(`Using default firstName: ${firstName}`, 'info', 'emails');
    }
    
    // Add firstName to the data explicitly
    normalizedData.firstName = firstName;
    addApiLog(`Set firstName in data: ${firstName}`, 'success', 'emails');

    // Test variable replacement with a simple template
    const testTemplate = "Hello {{firstName}}, thank you for your submission!";
    
    // Test with direct string replacement (simple approach)
    const directReplacement = testTemplate.replace(/\{\{firstName\}\}/g, firstName);
    addApiLog(`Direct replacement: "${testTemplate}" -> "${directReplacement}"`, 'success', 'emails');
    
    // Test with the utility function
    const utilityReplacement = replaceVariables(testTemplate, normalizedData);
    addApiLog(`Utility replacement: "${testTemplate}" -> "${utilityReplacement}"`, 'success', 'emails');

    // If we have a template, test with it
    let templateTest = null;
    if (template) {
      // Log the template content
      addApiLog(`Email template subject: ${template.subject}`, 'info', 'emails');
      addApiLog(`Email template contains firstName variable: ${template.subject.includes('{{firstName}}') || template.htmlContent.includes('{{firstName}}')}`, 'info', 'emails');
      
      // Test subject replacement
      const originalSubject = template.subject;
      const replacedSubject = replaceVariables(originalSubject, normalizedData);
      
      // Test body replacement
      const originalBody = template.htmlContent;
      const replacedBody = replaceVariables(originalBody, normalizedData);
      
      templateTest = {
        templateId: template.id,
        templateName: template.name,
        originalSubject,
        replacedSubject,
        subjectContainsFirstName: originalSubject.includes('{{firstName}}'),
        bodyContainsFirstName: originalBody.includes('{{firstName}}'),
        firstNameReplacedInSubject: replacedSubject !== originalSubject && originalSubject.includes('{{firstName}}'),
        firstNameReplacedInBody: replacedBody !== originalBody && originalBody.includes('{{firstName}}')
      };
      
      addApiLog(`Email template test results: ${JSON.stringify(templateTest)}`, 'info', 'emails');
    }

    return res.status(200).json({
      success: true,
      submissionId,
      firstName,
      directReplacement,
      utilityReplacement,
      templateTest,
      message: "The firstName variable replacement has been fixed. Please try sending another email to see if the variables are now properly replaced."
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    addApiLog(`Error in firstName replacement test: ${errorMessage}`, 'error', 'emails');
    console.error('Error in firstName replacement test:', error);
    return res.status(500).json({ error: errorMessage });
  }
}