/**
 * Form System 2.0 Submission Services Test Script
 * 
 * This file contains test functions for the form submission services.
 * Run with: npx ts-node src/lib/forms2/services/submission/test.ts
 */

import * as logger from '@/util/logger';
import axios from 'axios';
import { submissionService } from './index';

// Mock form data for testing
const mockInquiryFormData = {
  name_field: 'John Doe',
  email_field: 'john.doe@example.com',
  phone_field: '+1234567890',
  message_field: 'This is a test inquiry message',
  preferred_contact: 'email'
};

const mockBookingFormData = {
  name_field: 'Jane Smith',
  email_field: 'jane.smith@example.com',
  phone_field: '+9876543210',
  date_field: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
  time_field: '14:30',
  location_field: 'Main Office',
  service_type: 'Consultation'
};

// Mock form IDs
const INQUIRY_FORM_ID = 'test_inquiry_form_id';
const BOOKING_FORM_ID = 'test_booking_form_id';

/**
 * Test the inquiry form submission process
 */
async function testInquiryFormSubmission() {
  console.log('Testing inquiry form submission...');
  
  try {
    const result = await submissionService.processSubmission(
      INQUIRY_FORM_ID,
      mockInquiryFormData,
      'test_tracking_token',
      Date.now().toString()
    );
    
    console.log('Inquiry form submission result:', result);
    console.log('Inquiry form submission test: SUCCESS');
    return result;
  } catch (error: any) {
    console.error('Inquiry form submission test: FAILED');
    console.error('Error:', error.message);
    return null;
  }
}

/**
 * Test the booking form submission process
 */
async function testBookingFormSubmission() {
  console.log('Testing booking form submission...');
  
  try {
    const result = await submissionService.processSubmission(
      BOOKING_FORM_ID,
      mockBookingFormData,
      'test_tracking_token',
      Date.now().toString()
    );
    
    console.log('Booking form submission result:', result);
    console.log('Booking form submission test: SUCCESS');
    return result;
  } catch (error: any) {
    console.error('Booking form submission test: FAILED');
    console.error('Error:', error.message);
    return null;
  }
}

/**
 * Test the email processing for a form submission
 */
async function testEmailProcessing(submissionId: string, formId: string) {
  console.log('Testing email processing...');
  
  try {
    // Ensure we have a valid base URL for the API call
    const baseUrl = process.env.NEXTAUTH_URL || 
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    
    // Prepare the email processing data
    const emailProcessingData = {
      formId,
      submissionId,
      source: 'test-script'
    };
    
    console.log('Calling email processing API with data:', emailProcessingData);
    
    // Call the email processing API with the full URL
    const response = await axios.post(
      `${baseUrl}/api/emails/process-submission2`, 
      emailProcessingData,
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    console.log('Email processing response:', response.data);
    console.log('Email processing test: SUCCESS');
  } catch (error: any) {
    console.error('Email processing test: FAILED');
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('Starting form submission tests...');
  
  // Test inquiry form submission
  const inquiryResult = await testInquiryFormSubmission();
  
  // Test booking form submission
  const bookingResult = await testBookingFormSubmission();
  
  // Test email processing if submission was successful
  if (inquiryResult?.submissionId) {
    await testEmailProcessing(inquiryResult.submissionId, INQUIRY_FORM_ID);
  }
  
  console.log('All tests completed.');
}

// Run the tests
runTests().catch(console.error);
