/**
 * Helper functions for dynamic template rendering
 */

/**
 * Processes special template directives for dynamic content like line items
 * 
 * @param html - The HTML template content
 * @param data - The data object containing values to inject
 * @returns Processed HTML with dynamic content
 */
export function processTemplateDirectives(html: string, data: Record<string, any> = {}): string {
  let processedHtml = html;
  
  // Process line items directive
  processedHtml = processLineItemsDirective(processedHtml, data);
  
  // Process standard variable replacements
  processedHtml = replaceVariables(processedHtml, data);
  
  return processedHtml;
}

/**
 * Replaces standard {{variable}} placeholders with values from data object
 */
function replaceVariables(html: string, data: Record<string, any> = {}): string {
  let processedHtml = html;
  
  // Create a flattened data object with top-level access to all properties
  const flattenedData = { ...data };
  
  // If we have nested data properties, flatten them for easier access
  if (data && typeof data === 'object') {
    if (data.submission?.data) {
      Object.entries(data.submission.data).forEach(([key, value]) => {
        flattenedData[key] = value;
      });
    }
    if (data.formData) {
      Object.entries(data.formData).forEach(([key, value]) => {
        flattenedData[key] = value;
      });
    }
    if (data.data) {
      Object.entries(data.data).forEach(([key, value]) => {
        flattenedData[key] = value;
      });
    }
  }
  
  // Add debug logging in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    console.log('Available variables for template:', Object.keys(flattenedData));
  }
  
  // Process conditional blocks first (e.g., {{#if phone}}...{{/if}})
  const conditionalRegex = /{{#if\s+(\w+)}}(.*?){{\/if}}/gs;
  processedHtml = processedHtml.replace(conditionalRegex, (match, condition, content) => {
    return flattenedData[condition] ? content : '';
  });
  
  // First replace all direct variables in the format {{variable}}
  Object.entries(flattenedData).forEach(([key, value]) => {
    if (typeof value !== 'object' && value !== null && value !== undefined) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processedHtml = processedHtml.replace(regex, String(value || ''));
    }
  });
  
  // Then handle nested object properties like {{booking.location}}
  const nestedVarRegex = /{{([a-zA-Z0-9]+)\.([a-zA-Z0-9]+)}}/g;
  processedHtml = processedHtml.replace(nestedVarRegex, (match: string, objName: string, propName: string) => {
    if (data[objName] && typeof data[objName] === 'object' && data[objName][propName] !== undefined) {
      return String(data[objName][propName] || '');
    }
    return match; // Keep the original if not found
  });
  
  // Handle any variable format with a generic approach
  // This will catch all remaining variables in the format {{anyVariableName}}
  const anyVarRegex = /{{([^{}]+)}}/g;
  processedHtml = processedHtml.replace(anyVarRegex, (match: string, variableName: string) => {
    // If we already replaced this variable, don't try to process it again
    if (match !== `{{${variableName}}}`) {
      return match;
    }
    
    // Check for direct match first
    if (flattenedData[variableName] !== undefined) {
      return String(flattenedData[variableName] || '');
    }
    
    // Try to find a match by normalizing the variable name (removing special characters)
    const normalizedVarName = variableName.replace(/[&:,'()\s]/g, '');
    for (const key in flattenedData) {
      const normalizedKey = key.replace(/[&:,'()\s]/g, '');
      if (normalizedKey === normalizedVarName && flattenedData[key] !== undefined) {
        return String(flattenedData[key] || '');
      }
    }
    
    // Try to match section-prefixed variables
    // Extract potential section prefix and field name
    const sectionPrefixMatch = variableName.match(/^([a-zA-Z0-9]+)([A-Z].*)$/);
    if (sectionPrefixMatch) {
      const [, sectionPrefix, fieldName] = sectionPrefixMatch;
      
      // Convert the first character of fieldName to lowercase to get the original field name
      const originalFieldName = fieldName.charAt(0).toLowerCase() + fieldName.slice(1);
      
      // Check if the data contains a section with this prefix
      const sectionData = flattenedData[sectionPrefix];
      if (sectionData && typeof sectionData === 'object' && sectionData[originalFieldName] !== undefined) {
        return String(sectionData[originalFieldName] || '');
      }
      
      // If we can't find it in a section object, check if there's a direct match with the original field name
      if (flattenedData[originalFieldName] !== undefined) {
        return String(flattenedData[originalFieldName] || '');
      }
    }
    
    // Log missing variables in non-production environments
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Variable not found: ${variableName}`);
    }
    
    return match; // Keep the original if not found
  });
  
  return processedHtml;
}

/**
 * Processes line items directive in the format:
 * <!-- BEGIN_LINE_ITEMS -->
 * <tr>
 *   <td>{{item.description}}</td>
 *   <td>{{item.quantity}}</td>
 *   <td>{{item.unitPrice}}</td>
 *   <td>{{item.amount}}</td>
 * </tr>
 * <!-- END_LINE_ITEMS -->
 */
function processLineItemsDirective(html: string, data: Record<string, any> = {}): string {
  const lineItemsRegex = /<!-- BEGIN_LINE_ITEMS -->([\s\S]*?)<!-- END_LINE_ITEMS -->/g;
  
  return html.replace(lineItemsRegex, (match: string, templateContent: string) => {
    // If no line items in data, return empty string
    if (!data.lineItems || !Array.isArray(data.lineItems) || data.lineItems.length === 0) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('No line items found in data');
      }
      return '';
    }
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Processing ${data.lineItems.length} line items`);
    }
    
    // Generate HTML for each line item
    return data.lineItems.map((item: any) => {
      let itemHtml = templateContent;
      
      // Replace item variables
      Object.entries(item).forEach(([key, value]) => {
        const regex = new RegExp(`{{item.${key}}}`, 'g');
        itemHtml = itemHtml.replace(regex, String(value || ''));
      });
      
      return itemHtml;
    }).join('');
  });
}

/**
 * Creates a sample line items table that can be inserted into templates
 */
export function getSampleLineItemsTable(): string {
  return '<table border="1" cellpadding="5" cellspacing="0" style="width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 20px;">' +
    '<thead>' +
      '<tr style="background-color: #f2f2f2;">' +
        '<th style="text-align: left;">Description</th>' +
        '<th style="text-align: center;">Quantity</th>' +
        '<th style="text-align: right;">Unit Price</th>' +
        '<th style="text-align: right;">Amount</th>' +
      '</tr>' +
    '</thead>' +
    '<tbody>' +
      '<!-- BEGIN_LINE_ITEMS -->' +
      '<tr>' +
        '<td>{{item.description}}</td>' +
        '<td style="text-align: center;">{{item.quantity}}</td>' +
        '<td style="text-align: right;">${{item.unitPrice}}</td>' +
        '<td style="text-align: right;">${{item.amount}}</td>' +
      '</tr>' +
      '<!-- END_LINE_ITEMS -->' +
    '</tbody>' +
    '<tfoot>' +
      '<tr>' +
        '<td colspan="3" style="text-align: right; font-weight: bold;">Total:</td>' +
        '<td style="text-align: right; font-weight: bold;">${{totalAmount}}</td>' +
      '</tr>' +
    '</tfoot>' +
  '</table>';
}

/**
 * Generates sample line items data for template preview
 */
export function getSampleLineItemsData(): any[] {
  return [
    {
      description: "Marriage Ceremony",
      quantity: 1,
      unitPrice: 250.00,
      amount: 250.00
    },
    {
      description: "Travel Fee",
      quantity: 1,
      unitPrice: 50.00,
      amount: 50.00
    },
    {
      description: "Certificate Processing",
      quantity: 1,
      unitPrice: 25.00,
      amount: 25.00
    }
  ];
}