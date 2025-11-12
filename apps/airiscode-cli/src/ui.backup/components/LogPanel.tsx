import React from 'react';
import { Box, Text } from 'ink';

export interface LogPanelProps {
  logs: string[];
}

export const LogPanel: React.FC<LogPanelProps> = ({ logs }) => {
  const visibleLogs = logs.slice(-10); // Show last 10 logs

  return (
    <Box padding={1} flexDirection="column">
      {visibleLogs.length === 0 ? (
        <Text dimColor>No logs yet</Text>
      ) : (
        visibleLogs.map((log, idx) => (
          <Text key={idx}>{log}</Text>
        ))
      )}
    </Box>
  );
};
