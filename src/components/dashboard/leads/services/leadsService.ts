import { toast } from "@/components/ui/use-toast";
import { Lead, LeadStatus } from "../types/types";
import { generateBookingLink as generateBookingLinkUtil } from "@/util/tracking-links";

// Function to fetch all leads
export async function fetchLeads(): Promise<Lead[]> {
  try {
    // Add cache-busting query parameter to ensure we get fresh data
    const timestamp = new Date().getTime();
    const response = await fetch(`/api/leads?_=${timestamp}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        // Add cache control headers to prevent caching
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || errorData.error || "Failed to fetch leads");
    }
    
    return await response.json();
  } catch (err) {
    console.error("Error fetching leads:", err);
    throw err;
  }
}

// Cache for lead details to prevent redundant API calls
const leadDetailsCache: Record<string, { data: Lead, timestamp: number }> = {};

// Function to fetch lead details
export async function fetchLeadDetails(leadId: string, minimal: boolean = false): Promise<Lead> {
  try {
    // Check if we have a cached version that's less than 5 minutes old
    const cachedLead = leadDetailsCache[leadId];
    const now = Date.now();
    const cacheExpiry = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    if (cachedLead && (now - cachedLead.timestamp < cacheExpiry)) {
      console.log(`Using cached lead details for ${leadId}`);
      return cachedLead.data;
    }
    
    // If not in cache or cache expired, fetch from API
    const response = await fetch(`/api/leads/${leadId}?minimal=${minimal}`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || errorData.error || "Failed to fetch lead details");
    }
    
    const leadData = await response.json();
    
    // Store in cache
    leadDetailsCache[leadId] = {
      data: leadData,
      timestamp: now
    };
    
    return leadData;
  } catch (err) {
    console.error("Error fetching lead details:", err);
    throw err;
  }
}

// Function to fetch booking forms
export async function fetchBookingForms() {
  try {
    const response = await fetch(`/api/forms?type=booking`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || errorData.error || "Failed to fetch booking forms");
    }
    
    return await response.json();
  } catch (err) {
    console.error("Error fetching booking forms:", err);
    throw err;
  }
}

// Function to generate a booking link for a lead with selected form
export async function generateBookingLinkWithForm(leadId: string, formId: string): Promise<string> {
  try {
    // First, fetch the form to determine if it's a Form 2.0 form
    const formResponse = await fetch(`/api/forms/${formId}`);
    if (!formResponse.ok) {
      throw new Error("Failed to fetch form details");
    }
    
    const formData = await formResponse.json();
    const isForm2 = !!formData.formSections; // Form 2.0 forms have formSections
    
    // Get the base URL
    const baseUrl = window.location.origin;
    
    // Generate the booking link using the utility function
    let bookingLink = generateBookingLinkUtil(baseUrl, formId, leadId);
    
    // If this is a Form 2.0 form, modify the link to use the forms2 path
    if (isForm2 && bookingLink.includes('/forms/')) {
      bookingLink = bookingLink.replace('/forms/', '/forms2/');
    }
    
    return bookingLink;
  } catch (err) {
    console.error("Error generating booking link:", err);
    throw err;
  }
}

// Function to generate a booking link for a lead
export async function generateBookingLink(lead: Lead): Promise<string> {
  try {
    const leadId = lead.id;
    
    // Determine if this is a Form 2.0 lead
    const isForm2 = !!lead.form?.formSections;
    
    // First, we need to get a form ID to use
    let formId = lead.formId;
    
    // If the lead has a form object, use that form's ID
    if (lead.form) {
      formId = lead.form.id;
    }
    
    // Get the base URL
    const baseUrl = window.location.origin;
    
    // Generate the booking link using the utility function
    let bookingLink = generateBookingLinkUtil(baseUrl, formId, leadId);
    
    // If this is a Form 2.0 lead, modify the link to use the forms2 path
    if (isForm2 && bookingLink.includes('/forms/')) {
      bookingLink = bookingLink.replace('/forms/', '/forms2/');
    }
    
    return bookingLink;
  } catch (err) {
    console.error("Error generating booking link:", err);
    throw err;
  }
}

// Function to update lead status
export async function updateLeadStatus(leadId: string, status: LeadStatus): Promise<Lead> {
  try {
    const response = await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || errorData.error || "Failed to update lead status");
    }
    
    return await response.json();
  } catch (err) {
    console.error("Error updating lead status:", err);
    throw err;
  }
}
