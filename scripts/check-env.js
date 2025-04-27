// Simple script to check if environment variables are set
// without revealing their actual values
require('dotenv').config();

if (process.env.NODE_ENV !== 'production') {
  console.log('Environment Variable Check:');
}
if (process.env.NODE_ENV !== 'production') {
  console.log('---------------------------');
}

const checkVar = (name) => {
  const exists = !!process.env[name];
  if (process.env.NODE_ENV !== 'production') {
    console.log(`${name}: ${exists ? 'Set ✓' : 'Not set ✗'}`);
  }
  if (exists) {
    // Only show length and first/last character to help debug without revealing full value
    const value = process.env[name];
    if (process.env.NODE_ENV !== 'production') {
      console.log(`  Length: ${value.length} characters`);
    }
    if (value.length > 0) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`  First character: ${value[0]}`);
      }
      if (process.env.NODE_ENV !== 'production') {
        console.log(`  Last character: ${value[value.length - 1]}`);
      }
    }
  }
};

// Check SendGrid variables
checkVar('SENDGRID_API_KEY');
checkVar('SENDGRID_FROM_EMAIL');

// Check other important environment variables
if (process.env.NODE_ENV !== 'production') {
  console.log('\nOther important variables:');
}
checkVar('NEXT_PUBLIC_SUPABASE_URL');
checkVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');
checkVar('SUPABASE_SERVICE_ROLE_KEY');
