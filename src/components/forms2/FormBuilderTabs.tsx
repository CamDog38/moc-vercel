/**
 * Form Builder Tabs Component
 * 
 * A tab-based navigation component for the form builder.
 * Allows easy navigation between sections during form editing.
 * Styled to match the legacy form builder's UI.
 */

import React from 'react';
import { Tabs, Tab, Box, Paper, Typography } from '@mui/material';
import { FormSection } from '@/lib/forms2/core/types';

interface FormBuilderTabsProps {
  sections: FormSection[];
  activeSection: number;
  onSectionChange: (index: number) => void;
}

export default function FormBuilderTabs({
  sections,
  activeSection,
  onSectionChange
}: FormBuilderTabsProps) {
  // Handle tab change
  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    onSectionChange(newValue);
  };

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        mb: 3,
        borderRadius: '4px',
        overflow: 'hidden'
      }}
    >
      <Box sx={{ 
        p: 1, 
        backgroundColor: 'primary.light',
        borderBottom: 1, 
        borderColor: 'divider'
      }}>
        <Typography 
          variant="subtitle1" 
          sx={{ 
            fontWeight: 'bold',
            color: 'white',
            pl: 1
          }}
        >
          Form Sections
        </Typography>
      </Box>
      <Tabs
        value={activeSection}
        onChange={handleChange}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="form sections"
        sx={{
          backgroundColor: 'background.paper',
          '& .MuiTab-root': {
            minHeight: '48px',
            textTransform: 'none',
            fontWeight: 'medium',
          },
          '& .Mui-selected': {
            fontWeight: 'bold',
            color: 'primary.main',
          }
        }}
      >
        {sections.map((section, index) => (
          <Tab 
            key={section.id} 
            label={section.title || `Section ${index + 1}`}
            id={`section-tab-${index}`}
            aria-controls={`section-tabpanel-${index}`}
          />
        ))}
      </Tabs>
    </Paper>
  );
}
