/**
 * Form System 2.0 - Public Form View
 * 
 * This page displays a public form for end users to fill out and submit.
 * It handles form rendering, validation, submission, and success/error states.
 * It also applies form styles from the form styles system.
 */

import { useRouter } from 'next/router';
import Head from 'next/head';
import { PublicFormView } from '@/components/forms2/public/PublicFormView';
import { useState, useEffect } from 'react';

export default function FormView() {
  const router = useRouter();
  const { id, styleId, preview } = router.query;
  const [title, setTitle] = useState('Form');
  const [customCss, setCustomCss] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch form title and styles
  useEffect(() => {
    if (id && typeof id === 'string') {
      // Fetch form metadata
      fetch(`/api/forms2/public/${id}/meta`)
        .then(res => res.json())
        .then(data => {
          if (data.title) {
            setTitle(data.title);
          }
        })
        .catch(err => {
          console.error('Error fetching form title:', err);
        });
      
      // Fetch form styles - using the same approach as the regular form view
      fetchFormStyles();
    }
  }, [id, styleId, preview]);
  
  // Function to fetch form styles - directly copied from the regular form view
  const fetchFormStyles = async () => {
    try {
      // If we're in preview mode and have a styleId, fetch that specific style
      if (preview === 'true' && styleId) {
        const styleResponse = await fetch(`/api/form-styles/${styleId}`);
        if (styleResponse.ok) {
          const styleData = await styleResponse.json();
          setCustomCss(styleData.cssContent || '');
          setLoading(false);
          return;
        } else {
          console.error('Error fetching specific form style:', 
            `Status: ${styleResponse.status} ${styleResponse.statusText}`);
        }
      }
      
      // Otherwise, fetch styles for this form (including global styles)
      const response = await fetch(`/api/form-styles?formId=${id}`);
      if (response.ok) {
        const styles = await response.json();
        
        if (styles.length > 0) {
          // Combine all applicable styles, with form-specific styles taking precedence over global ones
          const formSpecificStyles = styles.filter((s: any) => !s.isGlobal);
          const globalStyles = styles.filter((s: any) => s.isGlobal);
          
          // Apply global styles first, then form-specific ones
          let combinedCss = '';
          globalStyles.forEach((style: any) => {
            if (style.cssContent) {
              combinedCss += style.cssContent + '\n\n';
            }
          });
          formSpecificStyles.forEach((style: any) => {
            if (style.cssContent) {
              combinedCss += style.cssContent + '\n\n';
            }
          });
          
          setCustomCss(combinedCss);
        }
      } else {
        console.error('Error fetching form styles:', 
          `Status: ${response.status} ${response.statusText}`);
        setError(`Failed to load styles: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error fetching form styles:', error);
      setError('Failed to load styles');
    } finally {
      setLoading(false);
    }
  };
  
  // If id is not available yet, show loading
  if (!id || typeof id !== 'string' || loading) {
    return (
      <>
        <Head>
          <title>Loading Form...</title>
        </Head>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p>Loading form...</p>
        </div>
      </>
    );
  }
  
  // Empty default styles - we'll only use custom CSS from the database
  const defaultStyles = '';
  
  // Combine custom CSS with default styles
  const combinedStyles = customCss || defaultStyles;
  
  return (
    <>
      <Head>
        <title>{title}</title>
        {/* Only apply custom CSS from the database */}
        {customCss && customCss.length > 0 && (
          <style dangerouslySetInnerHTML={{ __html: customCss }} />
        )}
      </Head>
      
      {/* Debug panel for preview mode */}
      {preview === 'true' && (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative mb-4">
          <strong className="font-bold">Style Debug Info: </strong>
          <div className="text-xs mt-2">
            <p>Form ID: {id}</p>
            <p>CSS Length: {combinedStyles.length} characters</p>
            <p>Using Custom CSS: {customCss.length > 0 ? 'Yes' : 'No'}</p>
            {error && <p className="text-red-500">Error: {error}</p>}
          </div>
        </div>
      )}
      
      {/* Render the form with a container class for styling */}
      <div className="form-container">
        <PublicFormView />
      </div>
    </>
  );
}