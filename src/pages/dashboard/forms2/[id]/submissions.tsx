/**
 * Form System 2.0 Dashboard - Form Submissions
 * 
 * This page displays submissions for a form and allows viewing submission details.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { 
  Button, Card, Container, Typography, Box, Alert, CircularProgress,
  Paper, Divider, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Dialog, DialogTitle, DialogContent, 
  DialogActions, IconButton, Chip
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import { FormSubmission2Model, Form2Model } from '@/lib/forms2/core/types';

export default function FormSubmissions() {
  const router = useRouter();
  const { id } = router.query;
  const { data: session, status } = useSession();
  const [form, setForm] = useState<Form2Model | null>(null);
  const [submissions, setSubmissions] = useState<FormSubmission2Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission2Model | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submissionData, setSubmissionData] = useState<Record<string, any>>({});

  // Fetch form and submissions when the component mounts or the ID changes
  useEffect(() => {
    if (status === 'authenticated' && id) {
      fetchFormAndSubmissions();
    }
  }, [status, id]);

  // Fetch form and submissions from the API
  const fetchFormAndSubmissions = async () => {
    try {
      setLoading(true);
      
      // Fetch form details
      const formResponse = await axios.get(`/api/forms2/${id}`);
      setForm(formResponse.data.form);
      
      // Fetch submissions
      const submissionsResponse = await axios.get(`/api/forms2/${id}/submissions`);
      setSubmissions(submissionsResponse.data);
      
      setError(null);
    } catch (err) {
      console.error('Error fetching form and submissions:', err);
      setError('Failed to load form submissions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Open submission details dialog
  const openSubmissionDialog = (submission: FormSubmission2Model) => {
    setSelectedSubmission(submission);
    try {
      // Parse submission data
      const data = JSON.parse(submission.data);
      setSubmissionData(data);
    } catch (err) {
      console.error('Error parsing submission data:', err);
      setSubmissionData({});
    }
    setDialogOpen(true);
  };

  // Close submission details dialog
  const closeSubmissionDialog = () => {
    setDialogOpen(false);
    setSelectedSubmission(null);
    setSubmissionData({});
  };

  // Format date for display
  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleString();
  };

  // If the user is not authenticated, redirect to the login page
  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  return (
    <DashboardLayout>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button 
            startIcon={<ArrowBackIcon />} 
            onClick={() => router.push(`/dashboard/forms2/${id}`)}
            sx={{ mr: 2 }}
          >
            Back to Form
          </Button>
          <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
            Form Submissions
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Card sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                {form?.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Viewing all submissions for this form.
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="body1" sx={{ mr: 2 }}>
                  Total Submissions: {submissions.length}
                </Typography>
                <Chip 
                  label={form?.isActive ? 'Active' : 'Inactive'} 
                  color={form?.isActive ? 'success' : 'default'} 
                  size="small" 
                  sx={{ mr: 1 }}
                />
                <Chip 
                  label={form?.isPublic ? 'Public' : 'Private'} 
                  color={form?.isPublic ? 'primary' : 'default'} 
                  size="small" 
                />
              </Box>
            </Card>

            {submissions.length === 0 ? (
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body1">
                  No submissions found for this form.
                </Typography>
              </Paper>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Submission ID</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {submissions.map((submission) => (
                      <TableRow key={submission.id}>
                        <TableCell>{submission.id}</TableCell>
                        <TableCell>{formatDate(submission.createdAt)}</TableCell>
                        <TableCell>
                          <Chip 
                            label={submission.status} 
                            color={submission.status === 'SUBMITTED' ? 'success' : 'default'} 
                            size="small" 
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton 
                            color="primary" 
                            onClick={() => openSubmissionDialog(submission)}
                            title="View Submission"
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* Submission Details Dialog */}
            <Dialog
              open={dialogOpen}
              onClose={closeSubmissionDialog}
              maxWidth="md"
              fullWidth
            >
              <DialogTitle>
                Submission Details
                <IconButton
                  aria-label="close"
                  onClick={closeSubmissionDialog}
                  sx={{ position: 'absolute', right: 8, top: 8 }}
                >
                  <CloseIcon />
                </IconButton>
              </DialogTitle>
              <DialogContent dividers>
                {selectedSubmission && (
                  <>
                    <Typography variant="subtitle1" gutterBottom>
                      Submission ID: {selectedSubmission.id}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Submitted: {formatDate(selectedSubmission.createdAt)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Status: {selectedSubmission.status}
                    </Typography>
                    {selectedSubmission.legacySubmissionId && (
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Legacy Submission ID: {selectedSubmission.legacySubmissionId}
                      </Typography>
                    )}
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Typography variant="h6" gutterBottom>
                      Form Data
                    </Typography>
                    
                    <TableContainer component={Paper} sx={{ mt: 2 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Field</TableCell>
                            <TableCell>Value</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {Object.entries(submissionData).map(([key, value]) => (
                            <TableRow key={key}>
                              <TableCell>{key}</TableCell>
                              <TableCell>
                                {typeof value === 'object' 
                                  ? JSON.stringify(value) 
                                  : String(value)
                                }
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    
                    {selectedSubmission.metadata && (
                      <>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="h6" gutterBottom>
                          Metadata
                        </Typography>
                        <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                          <pre style={{ margin: 0, overflow: 'auto' }}>
                            {JSON.stringify(JSON.parse(selectedSubmission.metadata), null, 2)}
                          </pre>
                        </Paper>
                      </>
                    )}
                  </>
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={closeSubmissionDialog}>Close</Button>
              </DialogActions>
            </Dialog>
          </>
        )}
      </Container>
    </DashboardLayout>
  );
}
