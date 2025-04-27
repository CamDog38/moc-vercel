/**
 * Form System 2.0 Debug - Public Test Page
 * 
 * This page provides a public testing interface for Form System 2.0 forms,
 * allowing testing of form submissions and email processing without authentication.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { 
  Container, Grid, Typography, Box, Paper, TextField, Button, 
  Divider, Alert, CircularProgress, List, ListItem, ListItemText,
  Tabs, Tab, Card, CardContent, FormControlLabel, Switch
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { Form2Model, FormConfig } from '@/lib/forms2/core/types';

// Interface for the tab panel props
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// Tab panel component
function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`test-tabpanel-${index}`}
      aria-labelledby={`test-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// Log entry interface
interface LogEntry {
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'error';
  details?: any;
}

export default function TestPublicPage() {
  const router = useRouter();
  const { id } = router.query;
  const [form, setForm] = useState<Form2Model | null>(null);
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);
  
  // Form submission test state
  const [formData, setFormData] = useState<string>('{}');
  
  // Email processing test state
  const [submissionId, setSubmissionId] = useState<string>('');
  const [emailProcessingData, setEmailProcessingData] = useState<string>('{}');
  
  // Direct email test state
  const [emailTemplateId, setEmailTemplateId] = useState<string>('');
  const [emailRecipient, setEmailRecipient] = useState<string>('');
  const [emailCc, setEmailCc] = useState<string>('');
  const [emailBcc, setEmailBcc] = useState<string>('');
  const [emailTestData, setEmailTestData] = useState<string>('{}');
  const [useRealEmails, setUseRealEmails] = useState<boolean>(false);

  // Fetch form when the component mounts or the ID changes
  useEffect(() => {
    if (id) {
      fetchForm();
    }
  }, [id]);

  // Fetch form from the API
  const fetchForm = async () => {
    try {
      setLoading(true);
      addLog('info', `Fetching form with ID: ${id}`);
      
      const response = await axios.get(`/api/forms2/${id}`);
      setForm(response.data.form);
      setFormConfig(response.data.formConfig);
      
      addLog('success', `Form loaded: ${response.data.form.title}`);
      setError(null);
    } catch (err) {
      console.error('Error fetching form:', err);
      setError('Failed to load form. Please check if the form ID is valid.');
      addLog('error', `Error loading form: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Add a log entry
  const addLog = (type: 'info' | 'success' | 'error', message: string, details?: any) => {
    setLogs(prev => [
      {
        timestamp: new Date(),
        message,
        type,
        details
      },
      ...prev
    ]);
  };

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setTestResult(null);
  };

  // Test form submission
  const testFormSubmission = async () => {
    try {
      setLoading(true);
      setTestResult(null);
      addLog('info', 'Testing form submission...');
      
      let data;
      try {
        data = JSON.parse(formData);
        addLog('info', 'Parsed form data', data);
      } catch (err) {
        addLog('error', 'Invalid JSON in form data');
        setTestResult({
          success: false,
          message: 'Invalid JSON in form data',
        });
        return;
      }
      
      addLog('info', `Submitting form data to /api/forms2/${id}/submissions`);
      const response = await axios.post(`/api/forms2/${id}/submissions`, {
        data
      });
      
      addLog('success', 'Form submission successful', response.data);
      setTestResult({
        success: true,
        message: 'Form submission successful',
        details: response.data
      });
    } catch (err) {
      console.error('Error testing form submission:', err);
      addLog('error', `Form submission failed: ${err.message}`, err.response?.data);
      setTestResult({
        success: false,
        message: `Form submission failed: ${err.message}`,
        details: err.response?.data
      });
    } finally {
      setLoading(false);
    }
  };

  // Test email processing
  const testEmailProcessing = async () => {
    try {
      setLoading(true);
      setTestResult(null);
      addLog('info', 'Testing email processing...');
      
      let data;
      try {
        data = JSON.parse(emailProcessingData);
        addLog('info', 'Parsed email processing data', data);
      } catch (err) {
        addLog('error', 'Invalid JSON in email processing data');
        setTestResult({
          success: false,
          message: 'Invalid JSON in email processing data',
        });
        return;
      }
      
      const payload: any = {
        formId: id,
        source: 'debug-test'
      };
      
      if (submissionId) {
        payload.submissionId = submissionId;
        addLog('info', `Using existing submission ID: ${submissionId}`);
      } else {
        payload.data = data;
        addLog('info', 'Using provided form data');
      }
      
      addLog('info', 'Sending request to /api/emails2/process-submission', payload);
      const response = await axios.post('/api/emails2/process-submission', payload);
      
      addLog('success', 'Email processing successful', response.data);
      setTestResult({
        success: true,
        message: `Email processing successful. Processed ${response.data.processedRules} rules, queued ${response.data.queuedEmails} emails.`,
        details: response.data
      });
    } catch (err) {
      console.error('Error testing email processing:', err);
      addLog('error', `Email processing failed: ${err.message}`, err.response?.data);
      setTestResult({
        success: false,
        message: `Email processing failed: ${err.message}`,
        details: err.response?.data
      });
    } finally {
      setLoading(false);
    }
  };

  // Test direct email
  const testDirectEmail = async () => {
    try {
      setLoading(true);
      setTestResult(null);
      addLog('info', 'Testing direct email...');
      
      if (!emailTemplateId) {
        addLog('error', 'Email template ID is required');
        setTestResult({
          success: false,
          message: 'Email template ID is required',
        });
        return;
      }
      
      if (!emailRecipient) {
        addLog('error', 'Email recipient is required');
        setTestResult({
          success: false,
          message: 'Email recipient is required',
        });
        return;
      }
      
      let testData;
      try {
        testData = JSON.parse(emailTestData);
        addLog('info', 'Parsed email test data', testData);
      } catch (err) {
        addLog('error', 'Invalid JSON in email test data');
        setTestResult({
          success: false,
          message: 'Invalid JSON in email test data',
        });
        return;
      }
      
      const payload = {
        templateId: emailTemplateId,
        recipient: emailRecipient,
        testData,
        formId: id,
        cc: emailCc || undefined,
        bcc: emailBcc || undefined,
      };
      
      if (!useRealEmails) {
        addLog('info', 'Using test mode (emails will not be sent)');
        setTestResult({
          success: true,
          message: 'Test mode: Email would be sent with these parameters',
          details: payload
        });
        setLoading(false);
        return;
      }
      
      addLog('info', 'Sending request to /api/emails2/send-test', payload);
      const response = await axios.post('/api/emails2/send-test', payload);
      
      addLog('success', 'Email sent successfully', response.data);
      setTestResult({
        success: true,
        message: `Email sent successfully to ${emailRecipient}`,
        details: response.data
      });
    } catch (err) {
      console.error('Error testing direct email:', err);
      addLog('error', `Email sending failed: ${err.message}`, err.response?.data);
      setTestResult({
        success: false,
        message: `Email sending failed: ${err.message}`,
        details: err.response?.data
      });
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleTimeString() + '.' + date.getMilliseconds().toString().padStart(3, '0');
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Form System 2.0 - Public Test Page
      </Typography>
      
      {loading && !form ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : (
        <>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h5" gutterBottom>
              {form?.title || 'Form Not Found'}
            </Typography>
            {form?.description && (
              <Typography variant="body2" color="text.secondary">
                {form.description}
              </Typography>
            )}
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Form ID:</strong> {form?.id}
              </Typography>
              <Typography variant="body2">
                <strong>Status:</strong> {form?.isActive ? 'Active' : 'Inactive'}
              </Typography>
              <Typography variant="body2">
                <strong>Visibility:</strong> {form?.isPublic ? 'Public' : 'Private'}
              </Typography>
            </Box>
          </Paper>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={{ mb: 3 }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                  <Tabs value={tabValue} onChange={handleTabChange} aria-label="test tabs">
                    <Tab label="Test Form Submission" />
                    <Tab label="Test Email Processing" />
                    <Tab label="Test Direct Email" />
                  </Tabs>
                </Box>

                <TabPanel value={tabValue} index={0}>
                  <Typography variant="h6" gutterBottom>
                    Test Form Submission
                  </Typography>
                  <Typography variant="body2" paragraph>
                    Submit test data to the form and see the response.
                  </Typography>
                  
                  <TextField
                    label="Form Data (JSON)"
                    multiline
                    rows={10}
                    value={formData}
                    onChange={(e) => setFormData(e.target.value)}
                    fullWidth
                    variant="outlined"
                    sx={{ mb: 2 }}
                  />
                  
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={testFormSubmission}
                    disabled={loading}
                    startIcon={<SendIcon />}
                  >
                    Test Form Submission
                  </Button>
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                  <Typography variant="h6" gutterBottom>
                    Test Email Processing
                  </Typography>
                  <Typography variant="body2" paragraph>
                    Test email rule processing for a form submission.
                  </Typography>
                  
                  <TextField
                    label="Submission ID (Optional)"
                    value={submissionId}
                    onChange={(e) => setSubmissionId(e.target.value)}
                    fullWidth
                    variant="outlined"
                    sx={{ mb: 2 }}
                    placeholder="Leave empty to use form data below"
                  />
                  
                  <TextField
                    label="Form Data (JSON)"
                    multiline
                    rows={8}
                    value={emailProcessingData}
                    onChange={(e) => setEmailProcessingData(e.target.value)}
                    fullWidth
                    variant="outlined"
                    sx={{ mb: 2 }}
                    disabled={!!submissionId}
                    placeholder={submissionId ? "Using existing submission" : "Enter form data as JSON"}
                  />
                  
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={testEmailProcessing}
                    disabled={loading}
                    startIcon={<SendIcon />}
                  >
                    Test Email Processing
                  </Button>
                </TabPanel>

                <TabPanel value={tabValue} index={2}>
                  <Typography variant="h6" gutterBottom>
                    Test Direct Email
                  </Typography>
                  <Typography variant="body2" paragraph>
                    Send a test email using a template.
                  </Typography>
                  
                  <TextField
                    label="Email Template ID"
                    value={emailTemplateId}
                    onChange={(e) => setEmailTemplateId(e.target.value)}
                    fullWidth
                    variant="outlined"
                    sx={{ mb: 2 }}
                    required
                  />
                  
                  <TextField
                    label="Recipient Email"
                    value={emailRecipient}
                    onChange={(e) => setEmailRecipient(e.target.value)}
                    fullWidth
                    variant="outlined"
                    sx={{ mb: 2 }}
                    required
                  />
                  
                  <TextField
                    label="CC (Optional)"
                    value={emailCc}
                    onChange={(e) => setEmailCc(e.target.value)}
                    fullWidth
                    variant="outlined"
                    sx={{ mb: 2 }}
                    placeholder="Comma-separated email addresses"
                  />
                  
                  <TextField
                    label="BCC (Optional)"
                    value={emailBcc}
                    onChange={(e) => setEmailBcc(e.target.value)}
                    fullWidth
                    variant="outlined"
                    sx={{ mb: 2 }}
                    placeholder="Comma-separated email addresses"
                  />
                  
                  <TextField
                    label="Test Data (JSON)"
                    multiline
                    rows={4}
                    value={emailTestData}
                    onChange={(e) => setEmailTestData(e.target.value)}
                    fullWidth
                    variant="outlined"
                    sx={{ mb: 2 }}
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={useRealEmails}
                        onChange={(e) => setUseRealEmails(e.target.checked)}
                        color="primary"
                      />
                    }
                    label="Send Real Email"
                    sx={{ mb: 2 }}
                  />
                  
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={testDirectEmail}
                    disabled={loading}
                    startIcon={<SendIcon />}
                  >
                    Test Email
                  </Button>
                </TabPanel>
              </Card>

              {testResult && (
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      {testResult.success ? (
                        <CheckCircleOutlineIcon color="success" sx={{ mr: 1 }} />
                      ) : (
                        <ErrorOutlineIcon color="error" sx={{ mr: 1 }} />
                      )}
                      <Typography 
                        variant="h6" 
                        color={testResult.success ? 'success.main' : 'error.main'}
                      >
                        {testResult.message}
                      </Typography>
                    </Box>
                    
                    {testResult.details && (
                      <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                        <pre style={{ margin: 0, overflow: 'auto' }}>
                          {JSON.stringify(testResult.details, null, 2)}
                        </pre>
                      </Paper>
                    )}
                  </CardContent>
                </Card>
              )}
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Test Logs
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  
                  {logs.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                      No logs yet. Run a test to see logs.
                    </Typography>
                  ) : (
                    <List sx={{ maxHeight: 600, overflow: 'auto' }}>
                      {logs.map((log, index) => (
                        <ListItem key={index} divider={index < logs.length - 1}>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Typography 
                                  variant="caption" 
                                  color="text.secondary" 
                                  sx={{ mr: 1 }}
                                >
                                  [{formatDate(log.timestamp)}]
                                </Typography>
                                <Typography 
                                  variant="body2" 
                                  color={
                                    log.type === 'success' 
                                      ? 'success.main' 
                                      : log.type === 'error' 
                                        ? 'error.main' 
                                        : 'inherit'
                                  }
                                >
                                  {log.message}
                                </Typography>
                              </Box>
                            }
                            secondary={
                              log.details && (
                                <Paper sx={{ mt: 1, p: 1, backgroundColor: '#f5f5f5' }}>
                                  <pre style={{ margin: 0, fontSize: '0.75rem', overflow: 'auto' }}>
                                    {JSON.stringify(log.details, null, 2)}
                                  </pre>
                                </Paper>
                              )
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </Container>
  );
}
