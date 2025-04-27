import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { addApiLog } from '@/pages/api/debug/logs';

/**
 * Checks if a word is likely to be a person's name
 * @param word The word to check
 * @returns boolean indicating if the word is likely a name
 */
function isLikelyName(word: string): boolean {
  if (!word || typeof word !== 'string') return false;
  
  // Convert to lowercase for comparison
  const lowerWord = word.toLowerCase();
  
  // Common words that are unlikely to be names
  const commonWords = [
    'at', 'in', 'on', 'the', 'a', 'an', 'and', 'or', 'but', 'for', 'with',
    'about', 'from', 'to', 'by', 'yes', 'no', 'maybe', 'please', 'thank',
    'thanks', 'hello', 'hi', 'hey', 'dear', 'sincerely', 'regards', 'best',
    'office', 'location', 'address', 'phone', 'email', 'contact', 'website',
    'our', 'your', 'my', 'their', 'his', 'her', 'its', 'we', 'they', 'i',
    'you', 'he', 'she', 'it', 'this', 'that', 'these', 'those', 'here', 'there'
  ];
  
  // Check if the word is in our list of common words
  if (commonWords.includes(lowerWord)) {
    addApiLog(`Word '${word}' is a common word, unlikely to be a name`, 'info', 'emails');
    return false;
  }
  
  // Check if the word starts with a capital letter (typical for names)
  if (word[0] !== word[0].toUpperCase()) {
    addApiLog(`Word '${word}' doesn't start with a capital letter, less likely to be a name`, 'info', 'emails');
    return false;
  }
  
  // Check if the word is very short (less than 2 characters)
  if (word.length < 2) {
    addApiLog(`Word '${word}' is too short to be a name`, 'info', 'emails');
    return false;
  }
  
  // Check if the word contains numbers or special characters
  if (/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(word)) {
    addApiLog(`Word '${word}' contains numbers or special characters, unlikely to be a name`, 'info', 'emails');
    return false;
  }
  
  // If it passed all our checks, it's likely a name
  return true;
}

/**
 * API endpoint to test firstName extraction from a form submission
 * This helps diagnose why {{firstName}} variable isn't being replaced correctly
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { submissionId } = req.body;

    if (!submissionId) {
      return res.status(400).json({ error: 'Missing submissionId parameter' });
    }

    // Log environment information
    addApiLog(`Testing firstName extraction in environment: ${process.env.NODE_ENV || 'unknown'}`, 'info', 'emails');
    addApiLog(`Deployment URL: ${process.env.NEXT_PUBLIC_DEPLOYMENT_URL || 'not set'}`, 'info', 'emails');
    addApiLog(`Base URL: ${process.env.NEXT_PUBLIC_BASE_URL || 'not set'}`, 'info', 'emails');
    
    // Fetch the submission with detailed data
    const submission = await prisma.formSubmission.findUnique({
      where: { id: submissionId },
      include: { lead: true }
    });

    if (!submission) {
      addApiLog(`Submission not found: ${submissionId}`, 'error', 'emails');
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Log submission data structure
    addApiLog(`Submission data structure: ${JSON.stringify({
      id: submission.id,
      hasData: !!submission.data,
      dataType: typeof submission.data,
      dataIsObject: typeof submission.data === 'object',
      dataKeys: submission.data && typeof submission.data === 'object' ? Object.keys(submission.data) : [],
      hasTimeStamp: submission.timeStamp !== undefined && submission.timeStamp !== null,
      timeStampType: typeof submission.timeStamp,
      timeStampValue: submission.timeStamp,
      hasTrackingToken: !!submission.trackingToken,
      trackingToken: submission.trackingToken,
      hasLeadId: !!submission.leadId,
      leadId: submission.leadId
    })}`, 'info', 'emails');

    // Detailed logging of submission.data
    if (submission.data && typeof submission.data === 'object') {
      addApiLog(`Full submission.data: ${JSON.stringify(submission.data)}`, 'info', 'emails');
    }

    // Create a normalized data structure for testing firstName extraction
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

    // Test all firstName extraction strategies
    const extractionResults = [];
    
    // Helper function to validate and extract firstName from a string value
    const extractFirstName = (value: string, strategy: string, field: string | null): { firstName: string, success: boolean } | null => {
      if (!value || typeof value !== 'string') return null;
      
      const nameParts = value.split(' ');
      if (nameParts.length === 0) return null;
      
      const firstWord = nameParts[0];
      
      // Validate that the first word is likely a name
      if (isLikelyName(firstWord)) {
        addApiLog(`${strategy}: Extracted firstName '${firstWord}' from ${field ? `field ${field}` : 'value'}: '${value}'`, 'success', 'emails');
        return { firstName: firstWord, success: true };
      } else {
        addApiLog(`${strategy}: Skipped unlikely name '${firstWord}' from ${field ? `field ${field}` : 'value'}: '${value}'`, 'info', 'emails');
        return null;
      }
    };

    // Strategy 1: Extract from name or fullName fields in submission data
    if (submission.data && typeof submission.data === 'object') {
      for (const [key, value] of Object.entries(submission.data)) {
        if ((key.toLowerCase() === 'name' || key.toLowerCase() === 'fullname') && value) {
          const result = extractFirstName(String(value), 'Strategy 1', key);
          if (result) {
            extractionResults.push({
              strategy: `From submission.data.${key}`,
              field: key,
              value: value,
              firstName: result.firstName,
              success: result.success
            });
          }
        }
      }
    }

    // Strategy 2: Extract from top-level name property
    if (normalizedData.name && typeof normalizedData.name === 'string') {
      const result = extractFirstName(normalizedData.name, 'Strategy 2', 'name');
      if (result) {
        extractionResults.push({
          strategy: 'From top-level name',
          field: 'name',
          value: normalizedData.name,
          firstName: result.firstName,
          success: result.success
        });
      }
    }

    // Strategy 3: Check in formData for firstName or first_name
    if (normalizedData.formData.firstName) {
      // For explicit firstName fields, we should still validate
      const result = extractFirstName(String(normalizedData.formData.firstName), 'Strategy 3a', 'firstName');
      if (result) {
        extractionResults.push({
          strategy: 'From formData.firstName',
          field: 'firstName',
          value: normalizedData.formData.firstName,
          firstName: result.firstName,
          success: result.success
        });
      }
    } else if (normalizedData.formData.first_name) {
      const result = extractFirstName(String(normalizedData.formData.first_name), 'Strategy 3b', 'first_name');
      if (result) {
        extractionResults.push({
          strategy: 'From formData.first_name',
          field: 'first_name',
          value: normalizedData.formData.first_name,
          firstName: result.firstName,
          success: result.success
        });
      }
    } else if (normalizedData.formData.name) {
      // Try to extract from name field in formData
      const result = extractFirstName(String(normalizedData.formData.name), 'Strategy 3c', 'name');
      if (result) {
        extractionResults.push({
          strategy: 'From formData.name',
          field: 'name',
          value: normalizedData.formData.name,
          firstName: result.firstName,
          success: result.success
        });
      }
    }

    // Strategy 4: Search for any field that might contain firstName
    if (extractionResults.length === 0) {
      // First check for common field names
      for (const fieldName of ['name', 'fullName', 'full_name']) {
        if (normalizedData.formData[fieldName]) {
          const result = extractFirstName(String(normalizedData.formData[fieldName]), 'Strategy 4a', fieldName);
          if (result) {
            extractionResults.push({
              strategy: `From formData.${fieldName} (common field search)`,
              field: fieldName,
              value: normalizedData.formData[fieldName],
              firstName: result.firstName,
              success: result.success
            });
            break;
          }
        }
      }
      
      // If still not found, search all fields
      if (extractionResults.length === 0) {
        for (const [key, value] of Object.entries(normalizedData.formData)) {
          if (
            (key.toLowerCase().includes('first') && key.toLowerCase().includes('name')) ||
            key.toLowerCase() === 'firstname'
          ) {
            const result = extractFirstName(String(value), 'Strategy 4b', key);
            if (result) {
              extractionResults.push({
                strategy: `From formData.${key} (field name search)`,
                field: key,
                value: value,
                firstName: result.firstName,
                success: result.success
              });
              break;
            }
          }
        }
      }
    }
    
    // Strategy 5: Deep inspection of form field values
    if (extractionResults.length === 0 && submission.data && typeof submission.data === 'object') {
      addApiLog(`Starting deep inspection of form field values`, 'info', 'emails');
      
      // Examine each field value to see if it contains structured data that might include a name
      for (const [key, fieldValue] of Object.entries(submission.data)) {
        // Skip if not a value we can work with
        if (!fieldValue || typeof fieldValue !== 'object') continue;
        
        addApiLog(`Inspecting field ${key} with value type: ${typeof fieldValue}`, 'info', 'emails');
        
        // Check if the field value has properties that might indicate it contains form field data
        if (typeof fieldValue === 'object') {
          // Look for name-related fields within this object
          for (const [subKey, subValue] of Object.entries(fieldValue)) {
            // Skip if not a string or number
            if (typeof subValue !== 'string' && typeof subValue !== 'number') continue;
            
            const subKeyLower = String(subKey).toLowerCase();
            const stringValue = String(subValue);
            
            // Check if this subkey looks like a name field
            if (subKeyLower === 'name' || 
                subKeyLower === 'fullname' || 
                subKeyLower === 'full_name' || 
                (subKeyLower.includes('first') && subKeyLower.includes('name')) || 
                subKeyLower === 'firstname') {
              
              const result = extractFirstName(stringValue, 'Strategy 5a', `${key}.${subKey}`);
              if (result) {
                extractionResults.push({
                  strategy: `From nested field data: ${key}.${subKey}`,
                  field: `${key}.${subKey}`,
                  value: stringValue,
                  firstName: result.firstName,
                  success: result.success
                });
                break;
              }
            }
            
            // If the value itself looks like a full name (contains space), extract first name
            if (stringValue.includes(' ') && stringValue.length > 3) {
              const result = extractFirstName(stringValue, 'Strategy 5b', `${key}.${subKey}`);
              if (result) {
                extractionResults.push({
                  strategy: `From field value that appears to be a full name: ${key}.${subKey}`,
                  field: `${key}.${subKey}`,
                  value: stringValue,
                  firstName: result.firstName,
                  success: result.success
                });
                break;
              }
            }
          }
        }
        
        // If we found a name, break out of the outer loop
        if (extractionResults.length > 0) break;
      }
      
      // If still not found, look for any string value that might be a name (contains a space)
      if (extractionResults.length === 0) {
        for (const [key, fieldValue] of Object.entries(submission.data)) {
          // Check if the value itself is a string that looks like a name
          if (typeof fieldValue === 'string' && fieldValue.includes(' ') && fieldValue.length > 3) {
            const result = extractFirstName(String(fieldValue), 'Strategy 5c', key);
            if (result) {
              extractionResults.push({
                strategy: `From field value that appears to be a name: ${key}`,
                field: key,
                value: fieldValue,
                firstName: result.firstName,
                success: result.success
              });
              break;
            }
          }
          
          // If the field value is an object, check if any of its string values look like a name
          if (fieldValue && typeof fieldValue === 'object') {
            for (const [subKey, subValue] of Object.entries(fieldValue)) {
              if (typeof subValue === 'string' && subValue.includes(' ') && subValue.length > 3) {
                const result = extractFirstName(String(subValue), 'Strategy 5d', `${key}.${subKey}`);
                if (result) {
                  extractionResults.push({
                    strategy: `From nested field value that appears to be a name: ${key}.${subKey}`,
                    field: `${key}.${subKey}`,
                    value: subValue,
                    firstName: result.firstName,
                    success: result.success
                  });
                  break;
                }
              }
            }
            
            // If we found a name, break out of the outer loop
            if (extractionResults.length > 0) break;
          }
        }
      }
    }

    // Strategy 6: Default fallback
    if (extractionResults.length === 0) {
      extractionResults.push({
        strategy: 'Default fallback',
        field: null,
        value: null,
        firstName: "Customer",
        success: false
      });
      addApiLog(`Strategy 6: Using default firstName "Customer" as no name was found`, 'info', 'emails');
    }

    // Test variable replacement with the extracted firstName
    const testTemplate = "Hello {{firstName}}, thank you for your submission!";
    const bestFirstName = extractionResults[0]?.firstName || "Customer";
    const replacedTemplate = testTemplate.replace(/\{\{firstName\}\}/g, bestFirstName);

    addApiLog(`Variable replacement test: "${testTemplate}" -> "${replacedTemplate}"`, 'info', 'emails');

    return res.status(200).json({
      success: true,
      submissionId,
      dataStructure: {
        hasData: !!submission.data,
        dataType: typeof submission.data,
        dataKeys: submission.data && typeof submission.data === 'object' ? Object.keys(submission.data) : [],
        hasTimeStamp: submission.timeStamp !== undefined && submission.timeStamp !== null,
        timeStampType: typeof submission.timeStamp,
        hasTrackingToken: !!submission.trackingToken
      },
      extractionResults,
      bestFirstName,
      replacedTemplate,
      normalizedDataKeys: Object.keys(normalizedData)
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    addApiLog(`Error in firstName extraction test: ${errorMessage}`, 'error', 'emails');
    console.error('Error in firstName extraction test:', error);
    return res.status(500).json({ error: errorMessage });
  }
}