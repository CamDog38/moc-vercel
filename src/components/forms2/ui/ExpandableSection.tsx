/**
 * Expandable Section Component
 * 
 * A reusable component for creating expandable/collapsible sections
 */

import { ReactNode } from 'react';
import { Box, Typography, IconButton, Collapse, Divider } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

interface ExpandableSectionProps {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
  showDivider?: boolean;
  titleAction?: ReactNode;
  startIcon?: ReactNode;
}

export default function ExpandableSection({
  title,
  expanded,
  onToggle,
  children,
  showDivider = true,
  titleAction,
  startIcon
}: ExpandableSectionProps) {
  return (
    <Box sx={{ mb: 2 }}>
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          cursor: 'pointer',
          mb: expanded ? 2 : 0
        }}
        onClick={onToggle}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
          {startIcon && (
            <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
              {startIcon}
            </Box>
          )}
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
            {title}
          </Typography>
        </Box>
        
        {titleAction}
        
        <IconButton size="small">
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>
      
      <Collapse in={expanded}>
        <Box sx={{ mt: 1, mb: 1 }}>
          {children}
        </Box>
      </Collapse>
      
      {showDivider && <Divider sx={{ my: 2 }} />}
    </Box>
  );
}
