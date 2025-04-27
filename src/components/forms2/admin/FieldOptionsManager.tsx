/**
 * Field Options Manager Component
 * 
 * A component for administrators to manage options for dropdown and radio fields.
 * This component allows adding, updating, and deleting options for a field.
 */

import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Typography, Button, TextField, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogActions, DialogContent, DialogTitle
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import { FieldOption } from '@/lib/forms2/core/types';
import axios from 'axios';

interface FieldOptionsManagerProps {
  fieldId: string;
  onOptionsChange?: (options: FieldOption[]) => void;
}

export default function FieldOptionsManager({ fieldId, onOptionsChange }: FieldOptionsManagerProps) {
  const [options, setOptions] = useState<FieldOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingOption, setEditingOption] = useState<FieldOption | null>(null);
  const [newOption, setNewOption] = useState<FieldOption>({ id: '', value: '', label: '' });

  // Load options when the component mounts or fieldId changes
  useEffect(() => {
    if (fieldId) {
      loadOptions();
    }
  }, [fieldId]);

  // Load options from the API
  const loadOptions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/api/forms2/fields/${fieldId}/options`);
      if (response.data.success) {
        setOptions(response.data.options || []);
        if (onOptionsChange) {
          onOptionsChange(response.data.options || []);
        }
      } else {
        setError(response.data.error || 'Failed to load options');
      }
    } catch (error) {
      console.error('Error loading options:', error);
      setError('Failed to load options');
    } finally {
      setLoading(false);
    }
  };

  // Add a new option
  const handleAddOption = async () => {
    if (!newOption.value || !newOption.label) {
      setError('Value and label are required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Generate a unique ID for the new option
      const optionWithId = {
        ...newOption,
        id: `option-${Date.now()}`
      };

      const response = await axios.post(`/api/forms2/fields/${fieldId}/options`, {
        options: [optionWithId]
      });

      if (response.data.success) {
        setOptions(response.data.options || []);
        if (onOptionsChange) {
          onOptionsChange(response.data.options || []);
        }
        setNewOption({ id: '', value: '', label: '' });
        setOpenDialog(false);
      } else {
        setError(response.data.error || 'Failed to add option');
      }
    } catch (error) {
      console.error('Error adding option:', error);
      setError('Failed to add option');
    } finally {
      setLoading(false);
    }
  };

  // Update an existing option
  const handleUpdateOption = async () => {
    if (!editingOption || !editingOption.value || !editingOption.label) {
      setError('Value and label are required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Find the index of the option being edited
      const index = options.findIndex(o => o.id === editingOption.id);
      if (index === -1) {
        setError('Option not found');
        return;
      }

      // Create a new array with the updated option
      const updatedOptions = [...options];
      updatedOptions[index] = editingOption;

      const response = await axios.put(`/api/forms2/fields/${fieldId}/options`, {
        options: updatedOptions
      });

      if (response.data.success) {
        setOptions(response.data.options || []);
        if (onOptionsChange) {
          onOptionsChange(response.data.options || []);
        }
        setEditingOption(null);
        setOpenDialog(false);
      } else {
        setError(response.data.error || 'Failed to update option');
      }
    } catch (error) {
      console.error('Error updating option:', error);
      setError('Failed to update option');
    } finally {
      setLoading(false);
    }
  };

  // Delete an option
  const handleDeleteOption = async (optionId: string) => {
    if (!window.confirm('Are you sure you want to delete this option?')) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await axios.delete(`/api/forms2/fields/${fieldId}/options`, {
        data: { optionIds: [optionId] }
      });

      if (response.data.success) {
        setOptions(response.data.options || []);
        if (onOptionsChange) {
          onOptionsChange(response.data.options || []);
        }
      } else {
        setError(response.data.error || 'Failed to delete option');
      }
    } catch (error) {
      console.error('Error deleting option:', error);
      setError('Failed to delete option');
    } finally {
      setLoading(false);
    }
  };

  // Open the dialog for adding a new option
  const openAddDialog = () => {
    setEditingOption(null);
    setNewOption({ id: '', value: '', label: '' });
    setOpenDialog(true);
  };

  // Open the dialog for editing an existing option
  const openEditDialog = (option: FieldOption) => {
    setNewOption({ id: '', value: '', label: '' });
    setEditingOption({ ...option });
    setOpenDialog(true);
  };

  // Close the dialog
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingOption(null);
    setNewOption({ id: '', value: '', label: '' });
    setError(null);
  };

  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Field Options</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={openAddDialog}
          disabled={loading}
        >
          Add Option
        </Button>
      </Box>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Value</TableCell>
              <TableCell>Label</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {options.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  {loading ? 'Loading options...' : 'No options available'}
                </TableCell>
              </TableRow>
            ) : (
              options.map((option) => (
                <TableRow key={option.id}>
                  <TableCell>{option.value}</TableCell>
                  <TableCell>{option.label}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => openEditDialog(option)}
                      disabled={loading}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteOption(option.id)}
                      disabled={loading}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog for adding/editing options */}
      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>
          {editingOption ? 'Edit Option' : 'Add Option'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Value"
            fullWidth
            value={editingOption ? editingOption.value : newOption.value}
            onChange={(e) => {
              if (editingOption) {
                setEditingOption({ ...editingOption, value: e.target.value });
              } else {
                setNewOption({ ...newOption, value: e.target.value });
              }
            }}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Label"
            fullWidth
            value={editingOption ? editingOption.label : newOption.label}
            onChange={(e) => {
              if (editingOption) {
                setEditingOption({ ...editingOption, label: e.target.value });
              } else {
                setNewOption({ ...newOption, label: e.target.value });
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={editingOption ? handleUpdateOption : handleAddOption} 
            disabled={loading}
            color="primary"
          >
            {editingOption ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
