/**
 * Utility functions for tracking form sessions
 */

// Track a form view (when a user just views the form without entering data)
export async function viewFormSession(formId: string, trackingToken?: string) {
  try {
    const response = await fetch('/api/forms/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        formId,
        status: 'VIEWED',
        trackingToken
      }),
    });

    if (!response.ok) {
      console.error('Failed to track form view:', await response.text());
      return null;
    }

    const data = await response.json();
    return data.sessionId;
  } catch (error) {
    console.error('Error tracking form view:', error);
    return null;
  }
}

// Start a form session (when a user begins filling in data)
export async function startFormSession(formId: string, initialData: Record<string, any> = {}, trackingToken?: string) {
  try {
    const response = await fetch('/api/forms/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        formId,
        data: initialData,
        trackingToken
      }),
    });

    if (!response.ok) {
      console.error('Failed to start form session:', await response.text());
      return null;
    }

    const data = await response.json();
    return data.sessionId;
  } catch (error) {
    console.error('Error starting form session:', error);
    return null;
  }
}

// Update an existing form session
export async function updateFormSession(sessionId: string, data: Record<string, any>) {
  try {
    const response = await fetch('/api/forms/sessions', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        data
      }),
    });

    if (!response.ok) {
      console.error('Failed to update form session:', await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating form session:', error);
    return false;
  }
}

// Complete a form session
export async function completeFormSession(sessionId: string, finalData: Record<string, any> = {}) {
  try {
    const response = await fetch('/api/forms/sessions', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        data: finalData,
        status: 'COMPLETED'
      }),
    });

    if (!response.ok) {
      console.error('Failed to complete form session:', await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error completing form session:', error);
    return false;
  }
}

// Debounce function to limit API calls
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function(...args: Parameters<T>): void {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(later, wait);
  };
}