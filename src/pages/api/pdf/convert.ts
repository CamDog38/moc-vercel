import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/util/supabase/api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate the user
    const supabase = createClient(req, res);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get the HTML content and options from the request body
    const { html, options = {} } = req.body;

    if (!html) {
      return res.status(400).json({ error: 'HTML content is required' });
    }

    // Return a success response with instructions to use client-side PDF generation
    res.status(200).json({ 
      message: 'PDF generation should be performed client-side using jsPDF and html2canvas',
      html: html,
      options: options
    });
    
  } catch (error) {
    console.error('Error in PDF conversion API:', error);
    res.status(500).json({ 
      error: 'Failed to process PDF conversion request', 
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}