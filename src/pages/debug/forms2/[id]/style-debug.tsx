/**
 * Form System 2.0 Style Debug Page
 * 
 * This page provides detailed debugging information about the styles for a Form System 2.0 form.
 * It shows the raw CSS, the form structure, and allows testing different style application methods.
 */

import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { PublicFormView } from '@/components/forms2/public/PublicFormView';

export default function StyleDebugPage() {
  const router = useRouter();
  const { id } = router.query;
  const [styleData, setStyleData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('styles');
  const [appliedMethod, setAppliedMethod] = useState<string | null>(null);
  const [cssContent, setCssContent] = useState('');
  
  // Fetch style debug data
  useEffect(() => {
    if (id && typeof id === 'string') {
      setLoading(true);
      
      fetch(`/api/forms2/public/${id}/debug-style`)
        .then(res => res.json())
        .then(data => {
          setStyleData(data);
          setLoading(false);
          
          // Extract CSS from the first style
          if (data.styles && data.styles.length > 0) {
            setCssContent(data.styles[0].css || '');
          }
        })
        .catch(err => {
          console.error('Error fetching style debug data:', err);
          setError('Failed to load style debug data');
          setLoading(false);
        });
    }
  }, [id]);
  
  // Apply styles directly
  const applyStylesDirect = () => {
    if (!styleData || !styleData.styles || styleData.styles.length === 0) return;
    
    // Combine all styles
    const combinedCss = styleData.styles.map((style: any) => style.css).join('\n\n');
    
    // Create a style element
    const styleElement = document.createElement('style');
    styleElement.type = 'text/css';
    styleElement.innerHTML = combinedCss;
    
    // Remove any existing debug styles
    const existingStyles = document.querySelectorAll('style[data-debug-style]');
    existingStyles.forEach(el => el.remove());
    
    // Add the data attribute for identification
    styleElement.setAttribute('data-debug-style', 'direct');
    
    // Append to head
    document.head.appendChild(styleElement);
    
    setAppliedMethod('direct');
  };
  
  // Apply styles with a wrapper
  const applyStylesWithWrapper = () => {
    if (!styleData || !styleData.styles || styleData.styles.length === 0) return;
    
    // Combine all styles
    let combinedCss = styleData.styles.map((style: any) => style.css).join('\n\n');
    
    // Add a wrapper class to increase specificity
    combinedCss = combinedCss.replace(/([^\r\n,{}]+)(,(?=[^}]*{)|\s*{)/g, '.form2-debug-wrapper $1$2');
    
    // Create a style element
    const styleElement = document.createElement('style');
    styleElement.type = 'text/css';
    styleElement.innerHTML = combinedCss;
    
    // Remove any existing debug styles
    const existingStyles = document.querySelectorAll('style[data-debug-style]');
    existingStyles.forEach(el => el.remove());
    
    // Add the data attribute for identification
    styleElement.setAttribute('data-debug-style', 'wrapper');
    
    // Append to head
    document.head.appendChild(styleElement);
    
    // Add the wrapper class to the form container
    const formContainer = document.querySelector('.form-container');
    if (formContainer) {
      formContainer.classList.add('form2-debug-wrapper');
    }
    
    setAppliedMethod('wrapper');
  };
  
  // Apply styles with !important
  const applyStylesWithImportant = () => {
    if (!styleData || !styleData.styles || styleData.styles.length === 0) return;
    
    // Combine all styles
    let combinedCss = styleData.styles.map((style: any) => style.css).join('\n\n');
    
    // Add !important to all properties
    combinedCss = combinedCss.replace(/([^{}:]+):\s*([^;}]+)(?=[;}])/g, '$1: $2 !important');
    
    // Create a style element
    const styleElement = document.createElement('style');
    styleElement.type = 'text/css';
    styleElement.innerHTML = combinedCss;
    
    // Remove any existing debug styles
    const existingStyles = document.querySelectorAll('style[data-debug-style]');
    existingStyles.forEach(el => el.remove());
    
    // Add the data attribute for identification
    styleElement.setAttribute('data-debug-style', 'important');
    
    // Append to head
    document.head.appendChild(styleElement);
    
    setAppliedMethod('important');
  };
  
  // Apply default styles
  const applyDefaultStyles = () => {
    const defaultStyles = `
      /* Form System 2.0 default styles */
      body {
        background-color: #f8f9fa !important;
        margin: 0 !important;
        padding: 0 !important;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      }
      
      /* Card styles */
      [class*="Card"] {
        background-color: white !important;
        border-radius: 8px !important;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1) !important;
        margin-bottom: 16px !important;
      }
      
      /* Form elements */
      input, select, textarea {
        border: 2px solid #e2e8f0 !important;
        border-radius: 6px !important;
        padding: 0.75rem !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }
      
      /* Buttons */
      button {
        font-weight: 600 !important;
        border-radius: 6px !important;
        padding: 0.75rem 1.5rem !important;
        cursor: pointer !important;
      }
      
      /* Primary buttons */
      button:not([class*="outline"]) {
        background-color: #4f46e5 !important;
        color: white !important;
      }
    `;
    
    // Create a style element
    const styleElement = document.createElement('style');
    styleElement.type = 'text/css';
    styleElement.innerHTML = defaultStyles;
    
    // Remove any existing debug styles
    const existingStyles = document.querySelectorAll('style[data-debug-style]');
    existingStyles.forEach(el => el.remove());
    
    // Add the data attribute for identification
    styleElement.setAttribute('data-debug-style', 'default');
    
    // Append to head
    document.head.appendChild(styleElement);
    
    setAppliedMethod('default');
  };
  
  // Reset styles
  const resetStyles = () => {
    // Remove any existing debug styles
    const existingStyles = document.querySelectorAll('style[data-debug-style]');
    existingStyles.forEach(el => el.remove());
    
    // Remove the wrapper class from the form container
    const formContainer = document.querySelector('.form-container');
    if (formContainer) {
      formContainer.classList.remove('form2-debug-wrapper');
    }
    
    setAppliedMethod(null);
  };
  
  // Update CSS content
  const handleCssChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCssContent(e.target.value);
  };
  
  // Apply custom CSS
  const applyCustomCss = () => {
    // Create a style element
    const styleElement = document.createElement('style');
    styleElement.type = 'text/css';
    styleElement.innerHTML = cssContent;
    
    // Remove any existing debug styles
    const existingStyles = document.querySelectorAll('style[data-debug-style]');
    existingStyles.forEach(el => el.remove());
    
    // Add the data attribute for identification
    styleElement.setAttribute('data-debug-style', 'custom');
    
    // Append to head
    document.head.appendChild(styleElement);
    
    setAppliedMethod('custom');
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <h1 className="text-2xl font-bold mb-4">Loading Style Debug Data...</h1>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <h1 className="text-2xl font-bold mb-4">Error</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          {error}
        </div>
      </div>
    );
  }
  
  return (
    <>
      <Head>
        <title>Form Style Debug - {id}</title>
      </Head>
      
      <div className="min-h-screen bg-gray-100 p-8">
        <h1 className="text-2xl font-bold mb-4">Form Style Debug</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Form Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p><strong>Form ID:</strong> {styleData.formId}</p>
              <p><strong>Form Exists:</strong> {styleData.formExists ? 'Yes' : 'No'}</p>
              <p><strong>Total Styles:</strong> {styleData.totalStyles}</p>
            </div>
            <div>
              <p><strong>Form-Specific Styles:</strong> {styleData.formSpecificStyles}</p>
              <p><strong>Global Styles:</strong> {styleData.globalStyles}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                className={`px-4 py-2 text-sm font-medium ${activeTab === 'styles' ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                onClick={() => setActiveTab('styles')}
              >
                Styles
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium ${activeTab === 'preview' ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                onClick={() => setActiveTab('preview')}
              >
                Preview
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium ${activeTab === 'structure' ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                onClick={() => setActiveTab('structure')}
              >
                HTML Structure
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium ${activeTab === 'custom' ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                onClick={() => setActiveTab('custom')}
              >
                Custom CSS
              </button>
            </nav>
          </div>
          
          <div className="p-6">
            {activeTab === 'styles' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Style Information</h2>
                
                <div className="mb-4">
                  <div className="flex space-x-2 mb-4">
                    <button
                      className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                      onClick={applyStylesDirect}
                    >
                      Apply Direct
                    </button>
                    <button
                      className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                      onClick={applyStylesWithWrapper}
                    >
                      Apply with Wrapper
                    </button>
                    <button
                      className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                      onClick={applyStylesWithImportant}
                    >
                      Apply with !important
                    </button>
                    <button
                      className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                      onClick={applyDefaultStyles}
                    >
                      Apply Default Styles
                    </button>
                    <button
                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                      onClick={resetStyles}
                    >
                      Reset Styles
                    </button>
                  </div>
                  
                  {appliedMethod && (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
                      <strong>Styles Applied:</strong> {appliedMethod}
                    </div>
                  )}
                </div>
                
                {styleData.styles.map((style: any, index: number) => (
                  <div key={style.id} className="mb-6 border-b pb-6">
                    <h3 className="text-lg font-semibold mb-2">
                      Style #{index + 1}: {style.name}
                    </h3>
                    <p className="mb-2">
                      <strong>ID:</strong> {style.id}<br />
                      <strong>Type:</strong> {style.isGlobal ? 'Global' : 'Form-Specific'}<br />
                      <strong>Form ID:</strong> {style.formId || 'N/A'}<br />
                      <strong>Created:</strong> {new Date(style.createdAt).toLocaleString()}<br />
                      <strong>Updated:</strong> {new Date(style.updatedAt).toLocaleString()}
                    </p>
                    <div className="mt-4">
                      <h4 className="font-semibold mb-2">CSS:</h4>
                      <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-60 text-sm">
                        {style.css}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {activeTab === 'preview' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Form Preview</h2>
                <div className="border p-4 rounded">
                  <PublicFormView />
                </div>
              </div>
            )}
            
            {activeTab === 'structure' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">HTML Structure</h2>
                <button
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 mb-4"
                  onClick={() => {
                    const formContainer = document.querySelector('.form-container');
                    if (formContainer) {
                      const structureDisplay = document.getElementById('structure-display');
                      if (structureDisplay) {
                        structureDisplay.textContent = formContainer.outerHTML;
                      }
                    }
                  }}
                >
                  Capture HTML Structure
                </button>
                <pre id="structure-display" className="bg-gray-100 p-4 rounded overflow-auto max-h-96 text-sm">
                  Click "Capture HTML Structure" to view the current form HTML
                </pre>
              </div>
            )}
            
            {activeTab === 'custom' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Custom CSS</h2>
                <div className="mb-4">
                  <textarea
                    className="w-full h-60 p-4 border rounded font-mono text-sm"
                    value={cssContent}
                    onChange={handleCssChange}
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                    onClick={applyCustomCss}
                  >
                    Apply Custom CSS
                  </button>
                  <button
                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    onClick={resetStyles}
                  >
                    Reset Styles
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
