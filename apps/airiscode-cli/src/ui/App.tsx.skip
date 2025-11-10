/**
 * Main TUI Application Component
 *
 * Renders the airiscode terminal UI using Ink.
 * Layout structure:
 * - Header (session info, badges)
 * - Main panels (diff, test, logs)
 * - Status bar (current phase, hotkeys)
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { DiffPanel } from './components/DiffPanel.js';
import { TestPanel } from './components/TestPanel.js';
import { LogPanel } from './components/LogPanel.js';
import { StatusBar } from './components/StatusBar.js';
import { Header } from './components/Header.js';
import { EventEmitter, EventHandler } from '../events/emitter.js';

export interface AppProps {
  sessionId: string;
  task: string;
  emitter: EventEmitter;
}

export const App: React.FC<AppProps> = ({ sessionId, task, emitter }) => {
  const [diffData, setDiffData] = useState<unknown>(null);
  const [testData, setTestData] = useState<unknown>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [phase, setPhase] = useState<string>('initializing');
  const [badges, setBadges] = useState<string[]>([]);

  // Register event handlers
  useEffect(() => {
    const handlers: EventHandler = {
      onDiffReady: (data) => setDiffData(data),
      onTestResult: (data) => setTestData(data),
      onGuardBlock: (summary) => {
        setLogs((prev) => [...prev, `🛡️  ${summary}`]);
        setBadges((prev) => [...prev, 'GUARD']);
        setTimeout(() => setBadges((prev) => prev.filter((b) => b !== 'GUARD')), 2000);
      },
      onError: (summary) => {
        setLogs((prev) => [...prev, `❌ ${summary}`]);
      },
      onInfo: (summary) => {
        setLogs((prev) => [...prev, summary]);
      },
    };

    // TODO: Wire up event emitter handlers
  }, [emitter]);

  return (
    <Box flexDirection="column" height="100%">
      <Header sessionId={sessionId} task={task} badges={badges} />

      <Box flexDirection="row" flexGrow={1}>
        <Box flexDirection="column" width="50%" borderStyle="single" borderColor="blue">
          <Text bold>📝 Diff</Text>
          <DiffPanel data={diffData} />
        </Box>

        <Box flexDirection="column" width="50%">
          <Box height="50%" borderStyle="single" borderColor="green">
            <Box flexDirection="column">
              <Text bold>🧪 Tests</Text>
              <TestPanel data={testData} />
            </Box>
          </Box>

          <Box height="50%" borderStyle="single" borderColor="yellow">
            <Box flexDirection="column">
              <Text bold>📋 Logs</Text>
              <LogPanel logs={logs} />
            </Box>
          </Box>
        </Box>
      </Box>

      <StatusBar phase={phase} />
    </Box>
  );
};
