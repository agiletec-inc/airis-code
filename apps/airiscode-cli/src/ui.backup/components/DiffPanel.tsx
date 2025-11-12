import React from 'react';
import { Box, Text } from 'ink';

export interface DiffPanelProps {
  data: unknown;
}

export const DiffPanel: React.FC<DiffPanelProps> = ({ data }) => {
  if (!data) {
    return (
      <Box padding={1}>
        <Text dimColor>No diff available</Text>
      </Box>
    );
  }

  // TODO: Parse and render actual diff data
  return (
    <Box padding={1} flexDirection="column">
      <Text color="green">+ Added lines</Text>
      <Text color="red">- Removed lines</Text>
      <Text dimColor>  Context lines</Text>
    </Box>
  );
};
