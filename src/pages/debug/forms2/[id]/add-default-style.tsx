/**
 * Form System 2.0 - Add Default Style Page
 * 
 * This page allows adding a default style to a Form System 2.0 form.
 */

import { useRouter } from 'next/router';
import { useState } from 'react';
import Head from 'next/head';

export default function AddDefaultStylePage() {
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Default CSS template for Form System 2.0
  const defaultCss = `
/* Form System 2.0 Default Styles */

/* Main container */
.form-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Card styles */
[class*="Card"] {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  margin-bottom: 1rem;
  padding: 1.5rem;
}

[class*="CardHeader"] {
  margin-bottom: 1rem;
}

[class*="CardTitle"] {
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
}

/* Form elements */
input, select, textarea {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e2e8f0;
  border-radius: 6px;
  font-size: 1rem;
  margin-bottom: 1rem;
  background-color: white;
}

input:focus, select:focus, textarea:focus {
  border-color: #4f46e5;
  outline: none;
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.2);
}

/* Labels */
label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
}

/* Buttons */
button {
  padding: 0.75rem 1.5rem;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

button:not([class*="outline"]) {
  background-color: #4f46e5;
  color: white;
  border: none;
}

button:not([class*="outline"]):hover {
  background-color: #4338ca;
}

button[class*="outline"] {
  background-color: transparent;
  border: 2px solid #4f46e5;
  color: #4f46e5;
}

button[class*="outline"]:hover {
  background-color: rgba(79, 70, 229, 0.1);
}

/* Form grid */
.grid {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 1rem;
}

@media (min-width: 640px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Form sections */
.form-section {
  margin-bottom: 2rem;
}

.form-section-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #1f2937;
}

/* Error messages */
.error-message {
  color: #ef4444;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

/* Success messages */
.success-message {
  color: #10b981;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}
  `;
  
  const [css, setCss] = useState(defaultCss);
  
  // Add default style to form
  const addDefaultStyle = async () => {
    if (!id || typeof id !== 'string') {
      setError('Form ID is required');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/forms2/public/${id}/update-style`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          css,
          name: 'Form System 2.0 Default Style',
          isGlobal: false
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add style');
      }
      
      setSuccess(true);
      
      // Redirect to style debug page after 2 seconds
      setTimeout(() => {
        router.push(`/debug/forms2/${id}/style-debug`);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <>
      <Head>
        <title>Add Default Style - {id}</title>
      </Head>
      
      <div className="min-h-screen bg-gray-100 p-8">
        <h1 className="text-2xl font-bold mb-4">Add Default Style to Form</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Form Information</h2>
          <p><strong>Form ID:</strong> {id}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">CSS Content</h2>
          <div className="mb-4">
            <textarea
              className="w-full h-96 p-4 border rounded font-mono text-sm"
              value={css}
              onChange={(e) => setCss(e.target.value)}
            />
          </div>
          
          <div className="flex space-x-4">
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              onClick={addDefaultStyle}
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Default Style'}
            </button>
            
            <button
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              onClick={() => setCss(defaultCss)}
            >
              Reset to Default
            </button>
          </div>
          
          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
              Style added successfully! Redirecting to style debug page...
            </div>
          )}
        </div>
      </div>
    </>
  );
}
