import React from 'react';
import { Box, Text } from 'ink';

export interface HeaderProps {
  sessionId: string;
  task: string;
  badges: string[];
}

export const Header: React.FC<HeaderProps> = ({ sessionId, task, badges }) => {
  return (
    <Box borderStyle="double" borderColor="cyan" paddingX={1}>
      <Box flexDirection="row" justifyContent="space-between" width="100%">
        <Text bold color="cyan">
          🤖 airiscode v0.1.0
        </Text>
        <Text dimColor>Session: {sessionId.slice(0, 8)}</Text>
      </Box>
      <Box>
        <Text>Task: {task}</Text>
        {badges.length > 0 && (
          <Box marginLeft={2}>
            {badges.map((badge) => (
              <Text key={badge} backgroundColor="red" color="white">
                {' '}
                {badge}{' '}
              </Text>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};
