import { NextApiRequest, NextApiResponse } from 'next';
import { addApiLog } from './logs';
import { replaceVariables } from '@/util/email-template-helpers';
import prisma from '@/lib/prisma';

// Helper function to debug variable replacement
function debugVariableReplacement(template: string, variables: Record<string, any>) {
  const variableMatches = template.match(/{{([^}]+)}}/g) || [];
  const results = [];
  
  for (const match of variableMatches) {
    // Extract the variable name without {{ }}
    const variableName = match.slice(2, -2).trim();
    
    // Skip conditional markers
    if (variableName.startsWith('#if') || variableName === '/if') {
      results.push({
        original: match,
        variableName,
        exists: false,
        value: null,
        isConditional: true
      });
      continue;
    }
    
    // Check if the variable exists in the data
    let exists = false;
    let value = null;
    let source = 'not found';
    
    // Check direct top-level access
    if (variables[variableName] !== undefined) {
      exists = true;
      value = variables[variableName];
      source = 'top level';
    }
    // Check in formData
    else if (variables.formData && variables.formData[variableName] !== undefined) {
      exists = true;
      value = variables.formData[variableName];
      source = 'formData';
    }
    // Check in submission.data
    else if (variables.submission?.data && variables.submission.data[variableName] !== undefined) {
      exists = true;
      value = variables.submission.data[variableName];
      source = 'submission.data';
    }
    // Special case for field IDs in submission.data
    // This handles cases where the form field ID is used instead of the field name
    else if (variables.submission?.data) {
      // Check if any key in submission.data matches a field ID pattern (like cm8of5h3q003rv66l8ciyv37a)
      const fieldIdPattern = /^[a-z0-9]{24,}$/;
      
      // Look for field IDs in the submission data
      for (const [key, fieldValue] of Object.entries(variables.submission.data)) {
        if (fieldIdPattern.test(key)) {
          // For field IDs, check if the field has a name property that matches the variable name
          if (typeof fieldValue === 'object' && fieldValue !== null && 
              'name' in fieldValue && fieldValue.name === variableName) {
            exists = true;
            value = fieldValue.value || fieldValue;
            source = `field ID ${key}`;
            break;
          }
          
          // Also check if the field ID itself is what we're looking for
          if (key === variableName) {
            exists = true;
            value = fieldValue;
            source = 'direct field ID match';
            break;
          }
        }
      }
    }
    // Special case for firstName which might be extracted from name
    else if (variableName === 'firstName' && variables.name && typeof variables.name === 'string') {
      const nameParts = variables.name.split(' ');
      if (nameParts.length > 0) {
        exists = true;
        value = nameParts[0];
        source = 'extracted from name';
      }
    }
    // Check for nested path
    else if (variableName.includes('.')) {
      const parts = variableName.split('.');
      let currentObj = variables;
      let found = true;
      
      for (const part of parts) {
        if (currentObj && typeof currentObj === 'object' && part in currentObj) {
          currentObj = currentObj[part];
        } else {
          found = false;
          break;
        }
      }
      
      if (found) {
        exists = true;
        value = currentObj;
        source = 'nested path';
      }
    }
    
    results.push({
      original: match,
      variableName,
      exists,
      value: exists ? String(value) : null,
      source,
      whitespaceIssue: match.slice(2, -2) !== variableName
    });
  }
  
  return results;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { template, variables, submissionId } = req.body;
    
    if (!template) {
      return res.status(400).json({ error: 'Missing template' });
    }
    
    // Log the input for debugging
    addApiLog(`Debugging variable replacement for template: ${template.substring(0, 50)}...`, 'info', 'emails');
    addApiLog(`Variables provided: ${JSON.stringify(variables || {})}`, 'info', 'emails');
    
    // Create enhanced variables with fallbacks
    const enhancedVariables = { ...(variables || {}) };
    
    // If a submission ID is provided, fetch the submission data
    if (submissionId) {
      try {
        const submission = await prisma.formSubmission.findUnique({
          where: { id: submissionId },
          include: {
            form: true,
            lead: true
          }
        });
        
        if (submission) {
          addApiLog(`Found submission with ID: ${submissionId}`, 'success', 'emails');
          
          // Add submission data to variables
          enhancedVariables.submission = submission;
          enhancedVariables.formSubmission = submission;
          
          // Add lead data if available
          if (submission.lead) {
            enhancedVariables.lead = submission.lead;
            enhancedVariables.leadId = submission.lead.id;
          }
          
          // Add form data if available
          if (submission.form) {
            enhancedVariables.form = submission.form;
            enhancedVariables.formId = submission.form.id;
          }
          
          // Add direct access to important fields
          enhancedVariables.trackingToken = submission.trackingToken;
          // Cast the submission to access timeStamp which exists but TypeScript doesn't recognize
          enhancedVariables.timeStamp = (submission as any).timeStamp || Date.now().toString();
          enhancedVariables.sourceLeadId = submission.sourceLeadId;
          enhancedVariables.leadId = submission.leadId;
          
          // Add formData property for consistent access
          enhancedVariables.formData = submission.data || {};
          
          // IMPORTANT: Flatten submission data to top level for direct access
          // This helps templates that use {{fieldName}} instead of {{formData.fieldName}}
          if (submission.data && typeof submission.data === 'object') {
            Object.entries(submission.data).forEach(([key, value]) => {
              enhancedVariables[key] = value;
            });
            
            // Log the flattened data keys
            const flattenedKeys = Object.keys(submission.data).join(', ');
            addApiLog(`Flattened submission data keys: ${flattenedKeys}`, 'info', 'emails');
          }
          
          addApiLog(`Enhanced variables with submission data: ${JSON.stringify({
            submissionId: submission.id,
            trackingToken: submission.trackingToken,
            timeStamp: enhancedVariables.timeStamp,
            sourceLeadId: submission.sourceLeadId,
            leadId: submission.leadId,
            flattenedDataAvailable: !!submission.data
          })}`, 'info', 'emails');
        } else {
          addApiLog(`No submission found with ID: ${submissionId}`, 'error', 'emails');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        addApiLog(`Error fetching submission: ${errorMessage}`, 'error', 'emails');
      }
    }
    
    // Also flatten any direct variables provided for testing
    // This is important for manual testing when no submission is provided
    if (variables && typeof variables === 'object') {
      // Add formData property if not already present
      if (!enhancedVariables.formData) {
        enhancedVariables.formData = { ...variables };
      }
      
      // Create a test submission object if not already present
      if (!enhancedVariables.submission) {
        const testSubmission = {
          id: `test-${Date.now()}`,
          data: { ...variables },
          timeStamp: Date.now().toString(),
          trackingToken: `test-token-${Date.now()}`
        };
        
        enhancedVariables.submission = testSubmission;
        enhancedVariables.formSubmission = testSubmission;
        
        addApiLog(`Created test submission with variables`, 'info', 'emails');
      }
    }
    
    // Analyze the template for variable usage
    const analysisResults = debugVariableReplacement(template, enhancedVariables);
    
    // Log the analysis results
    addApiLog(`Variable analysis results: ${JSON.stringify(analysisResults)}`, 'info', 'emails');
    
    // Use the replaceVariables function from email-template-helpers
    const replacedTemplate = replaceVariables(template, enhancedVariables);
    
    // After variable replacement, check if firstName was added to enhancedVariables
    // and update the analysis results accordingly
    if (enhancedVariables.firstName && analysisResults.some(result => result.variableName === 'firstName' && !result.exists)) {
      // Find the firstName analysis result and update it
      const firstNameResult = analysisResults.find(result => result.variableName === 'firstName');
      if (firstNameResult) {
        firstNameResult.exists = true;
        firstNameResult.value = String(enhancedVariables.firstName);
        firstNameResult.source = 'extracted during processing';
        
        addApiLog(`Updated firstName analysis result: ${JSON.stringify(firstNameResult)}`, 'info', 'emails');
      }
    }
    
    // Also perform a simple replacement for comparison
    const simpleReplacement = template.replace(/{{([^}]+)}}/g, (match: string, key: string) => {
      const trimmedKey = key.trim();
      
      if (enhancedVariables[trimmedKey] !== undefined) {
        return String(enhancedVariables[trimmedKey]);
      }
      
      return match; // Keep the original variable if not found
    });
    
    return res.status(200).json({
      originalTemplate: template,
      variables: enhancedVariables,
      analysis: analysisResults,
      replacedTemplate,
      simpleReplacement,
      usingHelperFunction: replacedTemplate !== simpleReplacement,
      timeStampValue: enhancedVariables.timeStamp || 'Not found'
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    addApiLog(`Error in variable replacement debug: ${errorMessage}`, 'error', 'emails');
    return res.status(500).json({ error: errorMessage });
  }
}