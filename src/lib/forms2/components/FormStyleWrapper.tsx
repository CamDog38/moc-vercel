import React, { useEffect, useState } from 'react';
import Head from 'next/head';

interface FormStyleWrapperProps {
  children: React.ReactNode;
  formId: string;
  styleId?: string;
  preview?: boolean;
  isForm2?: boolean;
}

export const FormStyleWrapper: React.FC<FormStyleWrapperProps> = ({
  children,
  formId,
  styleId,
  preview = false,
  isForm2 = false,
}) => {
  const [customCss, setCustomCss] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // Detect if this is a Form System 2.0 form based on the ID format
  const detectForm2 = (id: string) => {
    return id.startsWith('form2_') || id.startsWith('cm') || isForm2;
  };

  useEffect(() => {
    const fetchStyles = async () => {
      try {
        const isForm2Format = detectForm2(formId);
        console.log(`[FormStyleWrapper] Initializing for form ID: ${formId}, styleId: ${styleId || 'none'}, preview: ${preview}, isForm2: ${isForm2Format}`);
        
        // If styleId is provided, fetch that specific style
        if (styleId) {
          console.log(`[FormStyleWrapper] Fetching specific style: ${styleId}`);
          const response = await fetch(`/api/form-styles/${styleId}`);
          const style = await response.json();
          
          if (response.ok && style && style.cssContent) {
            console.log(`[FormStyleWrapper] Setting CSS from specific style: ${style.name}`);
            setCustomCss(style.cssContent);
          } else {
            console.error(`[FormStyleWrapper] Error fetching specific style: ${styleId}`, 
              `Status: ${response.status} ${response.statusText}`);
            setError(`Failed to fetch style: ${response.statusText}`);
          }
        } else {
          // Fetch form styles from the appropriate endpoint
          let stylesResponse;
          let stylesData;
          
          // Try the legacy endpoint first
          console.log(`[FormStyleWrapper] Fetching styles from legacy endpoint for form ID: ${formId}`);
          stylesResponse = await fetch(`/api/form-styles?formId=${formId}`);
          
          try {
            stylesData = await stylesResponse.json();
            console.log(`[FormStyleWrapper] Received ${stylesData.length} styles from legacy endpoint:`, stylesData);
            
            // Filter styles based on form system type if this is a Form System 2.0 form
            if (isForm2Format) {
              // For Form System 2.0 forms, we want to exclude styles that are explicitly marked for legacy forms only
              // This is a temporary solution until we implement the formSystemType field
              // For now, we'll just use all styles since there's no way to differentiate
              console.log(`[FormStyleWrapper] Using all styles for Form System 2.0 form`);
            }
            
            if (stylesResponse.ok && stylesData.length > 0) {
              // Combine all applicable styles, with form-specific styles taking precedence over global ones
              const formSpecificStyles = stylesData.filter((s: any) => !s.isGlobal);
              const globalStyles = stylesData.filter((s: any) => s.isGlobal);
              
              console.log(`[FormStyleWrapper] Form-specific styles: ${formSpecificStyles.length}, Global styles: ${globalStyles.length}`);
              setDebugInfo({
                formId,
                isForm2: isForm2Format,
                totalStyles: stylesData.length,
                formSpecificStyles: formSpecificStyles.length,
                globalStyles: globalStyles.length
              });
              
              // Apply global styles first, then form-specific ones
              let combinedCss = '';
              globalStyles.forEach((style: any) => {
                combinedCss += style.cssContent + '\n\n';
              });
              formSpecificStyles.forEach((style: any) => {
                combinedCss += style.cssContent + '\n\n';
              });
              
              console.log(`[FormStyleWrapper] Combined CSS length: ${combinedCss.length}`);
              setCustomCss(combinedCss);
            } else {
              console.log('[FormStyleWrapper] No styles found or error fetching styles');
              setDebugInfo({
                formId,
                isForm2: isForm2Format,
                error: 'No styles found',
                status: stylesResponse.status,
                statusText: stylesResponse.statusText
              });
            }
          } catch (parseError) {
            console.error('[FormStyleWrapper] Error parsing styles response:', parseError);
            setError('Failed to parse form styles response');
            setDebugInfo({
              formId,
              isForm2: isForm2Format,
              error: 'Failed to parse response',
              parseError: parseError instanceof Error ? parseError.message : String(parseError)
            });
          }
        }
      } catch (err) {
        console.error('[FormStyleWrapper] Error fetching styles:', err);
        setError('Failed to fetch styles');
        setDebugInfo({
          formId,
          error: 'Failed to fetch styles',
          errorMessage: err instanceof Error ? err.message : String(err)
        });
      }
    };

    fetchStyles();
  }, [formId, styleId, preview, isForm2]);

  // Add a debug style to see if styles are being applied
  const debugStyle = `
    /* Debug styles to verify CSS is being applied */
    .form-system-2-debug {
      border: 3px solid red !important;
    }
    .form-system-2-debug [class*="Card"] {
      border: 3px solid blue !important;
    }
    .form-system-2-debug input {
      border: 2px solid green !important;
    }
  `;

  return (
    <div className={preview ? "form-system-2-debug" : "form-system-2"}>
      <Head>
        {/* Always include debug styles in preview mode */}
        {preview && (
          <style type="text/css" dangerouslySetInnerHTML={{ __html: debugStyle }} />
        )}
        
        {/* Include the actual custom CSS */}
        {customCss && (
          <style type="text/css" dangerouslySetInnerHTML={{ __html: customCss }} />
        )}

        {/* Inline styles as a last resort */}
        <style type="text/css">{`
          /* Ensure styles are applied with higher specificity */
          .form-system-2 .min-h-screen,
          .form-system-2-debug .min-h-screen {
            background-color: #f8f9fa;
          }
          .form-system-2 [class*="Card"],
          .form-system-2-debug [class*="Card"] {
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
          }
        `}</style>
      </Head>

      {/* Show debug info in preview mode */}
      {error && preview && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {preview && (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative mb-4">
          <strong className="font-bold">Style Debug Info: </strong>
          <div className="text-xs mt-2">
            <p>Form ID: {formId}</p>
            <p>Is Form2: {isForm2 ? 'Yes' : 'No'}</p>
            <p>CSS Length: {customCss.length} characters</p>
            <p>Style Applied: {customCss.length > 0 ? 'Yes' : 'No'}</p>
            {debugInfo && (
              <pre className="overflow-auto max-h-40 mt-2">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* The actual form content */}
      {children}
    </div>
  );
};
