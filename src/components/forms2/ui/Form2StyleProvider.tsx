/**
 * Form2StyleProvider Component
 * 
 * A dedicated component for applying styles to Form System 2.0 forms.
 * This component fetches and applies styles directly to Form System 2.0 forms,
 * with a focus on high specificity and direct application.
 */

import { useEffect, useState } from 'react';
import Head from 'next/head';

interface Form2StyleProviderProps {
  formId: string;
  children: React.ReactNode;
  preview?: boolean;
}

export function Form2StyleProvider({ formId, children, preview = false }: Form2StyleProviderProps) {
  const [css, setCss] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStyles = async () => {
      try {
        console.log(`[Form2StyleProvider] Fetching styles for form ID: ${formId}`);
        
        // Fetch styles directly from the Form System 2.0 style endpoint
        const response = await fetch(`/api/forms2/public/${formId}/style`);
        const data = await response.json();
        
        console.log(`[Form2StyleProvider] API response:`, data);
        
        if (data.css) {
          console.log(`[Form2StyleProvider] Received CSS of length: ${data.css.length}`);
          
          // Process the CSS to increase specificity
          const processedCss = processStyles(data.css);
          setCss(processedCss);
          
          // Set debug info
          setDebugInfo({
            originalCssLength: data.css.length,
            processedCssLength: processedCss.length,
            timestamp: new Date().toISOString(),
            rawResponse: data
          });
        } else if (data.styles && data.styles.length > 0) {
          // If data.css is not available, check if we have styles array
          console.log(`[Form2StyleProvider] No CSS found in response, checking styles array`);
          
          // Manually combine styles
          let combinedCss = '';
          data.styles.forEach((style: any) => {
            if (style.cssContent) {
              combinedCss += style.cssContent + '\n\n';
            }
          });
          
          console.log(`[Form2StyleProvider] Manually combined CSS length: ${combinedCss.length}`);
          
          // Process the CSS to increase specificity
          const processedCss = processStyles(combinedCss);
          setCss(processedCss);
          
          // Set debug info
          setDebugInfo({
            originalCssLength: combinedCss.length,
            processedCssLength: processedCss.length,
            timestamp: new Date().toISOString(),
            stylesCount: data.styles.length,
            rawResponse: data
          });
        } else {
          console.log(`[Form2StyleProvider] No CSS found in response`);
          setError('No styles found for this form');
        }
      } catch (err) {
        console.error('Error fetching form styles:', err);
        setError('Failed to load styles');
      }
    };

    if (formId) {
      fetchStyles();
    }
  }, [formId]);

  // Process styles to increase specificity
  const processStyles = (originalCss: string): string => {
    // Add a unique class prefix to increase specificity
    return originalCss.replace(/([^\r\n,{}]+)(,(?=[^}]*{)|\s*{)/g, '.form2-root $1$2');
  };

  // Default styles that will be applied regardless of custom styles
  const defaultStyles = `
    /* Form System 2.0 base styles */
    .form2-root {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    /* Card styles */
    .form2-root [class*="Card"] {
      background-color: white !important;
      border-radius: 8px !important;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1) !important;
      margin-bottom: 16px !important;
    }
    
    /* Form elements */
    .form2-root input,
    .form2-root select,
    .form2-root textarea {
      border: 2px solid #e2e8f0 !important;
      border-radius: 6px !important;
      padding: 0.75rem !important;
      width: 100% !important;
      box-sizing: border-box !important;
    }
    
    /* Buttons */
    .form2-root button {
      font-weight: 600 !important;
      border-radius: 6px !important;
      padding: 0.75rem 1.5rem !important;
      cursor: pointer !important;
    }
    
    /* Primary buttons */
    .form2-root button:not([class*="outline"]) {
      background-color: #4f46e5 !important;
      color: white !important;
    }
  `;

  return (
    <>
      <Head>
        {/* Apply default styles first */}
        <style type="text/css">{defaultStyles}</style>
        
        {/* Apply custom styles with increased specificity */}
        {css && (
          <style type="text/css" dangerouslySetInnerHTML={{ __html: css }} />
        )}
      </Head>
      
      {/* Debug information in preview mode */}
      {preview && (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative mb-4">
          <strong className="font-bold">Form2 Style Debug: </strong>
          <div className="text-xs mt-2">
            <p>Form ID: {formId}</p>
            <p>CSS Applied: {css.length > 0 ? 'Yes' : 'No'}</p>
            <p>CSS Length: {css.length} characters</p>
            {error && <p className="text-red-500">Error: {error}</p>}
            {debugInfo && (
              <pre className="overflow-auto max-h-40 mt-2">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
      
      {/* Wrap children in a div with a specific class for targeting */}
      <div className="form2-root" id="form2-view">
        {children}
      </div>
    </>
  );
}
