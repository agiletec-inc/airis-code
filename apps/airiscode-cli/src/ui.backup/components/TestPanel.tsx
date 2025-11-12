import React from 'react';
import { Box, Text } from 'ink';

export interface TestPanelProps {
  data: unknown;
}

export const TestPanel: React.FC<TestPanelProps> = ({ data }) => {
  if (!data) {
    return (
      <Box padding={1}>
        <Text dimColor>No test results</Text>
      </Box>
    );
  }

  // TODO: Parse and render test results
  const testData = data as any;
  return (
    <Box padding={1} flexDirection="column">
      <Text color="green">✓ {testData.passed || 0} passed</Text>
      <Text color="red">✗ {testData.failed || 0} failed</Text>
      <Text dimColor>Duration: {testData.duration || '0'}ms</Text>
    </Box>
  );
};
