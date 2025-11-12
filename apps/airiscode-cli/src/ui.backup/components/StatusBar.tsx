import React from 'react';
import { Box, Text } from 'ink';

export interface StatusBarProps {
  phase: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({ phase }) => {
  return (
    <Box borderStyle="single" borderColor="gray" paddingX={1}>
      <Box flexDirection="row" justifyContent="space-between" width="100%">
        <Text>
          Phase: <Text bold color="yellow">{phase}</Text>
        </Text>
        <Text dimColor>
          [y] Approve [n] Reject [d] Diff [l] Logs [t] Tests [q] Quit
        </Text>
      </Box>
    </Box>
  );
};
