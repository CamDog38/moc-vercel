export function processTemplate(template: string, variables: Record<string, any>): string {
  // Regular expression to match variables in the format {{variableName}}
  const regex = /\{\{\s*([^{}]+?)\s*\}\}/g;
  
  return template.replace(regex, (match, variablePath) => {
    variablePath = variablePath.trim();
    
    // Handle dot notation for nested objects (e.g., {{partner1Details.firstName}})
    if (variablePath.includes('.')) {
      const parts = variablePath.split('.');
      let value = variables;
      
      // Traverse the object following the path
      for (const part of parts) {
        if (value === undefined || value === null) {
          return match; // Return original if path is invalid
        }
        value = value[part];
      }
      
      // Return the value if found, or original match if not
      return value !== undefined && value !== null ? String(value) : match;
    }
    
    // Handle direct variable access
    const value = variables[variablePath];
    
    // Return the value if found, original match if not
    return value !== undefined && value !== null ? String(value) : match;
  });
} 