/**
 * Interactive Chat UI Component
 *
 * Claude Code-style chat interface for airiscode
 */

import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import { OllamaDriver } from '@airiscode/drivers-local';
import type { ChatMessage } from '@airiscode/drivers';
import { ApprovalsLevel, TrustLevel } from '@airiscode/policies';

export interface ChatAppProps {
  sessionId: string;
  workingDir: string;
  model?: string;
  ollamaUrl?: string;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export const ChatApp: React.FC<ChatAppProps> = ({
  sessionId,
  workingDir,
  model = 'qwen2.5-coder:7b',
  ollamaUrl = 'http://localhost:11434'
}) => {
  const { exit } = useApp();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'system',
      content: `AIRIS Code - Interactive Coding Assistant (Ollama)\nSession: ${sessionId}\nWorking Directory: ${workingDir}\nModel: ${model}\n\nType your coding task or question. Press Ctrl+C to exit.`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const driverRef = useRef<OllamaDriver | null>(null);

  // Initialize Ollama driver
  useEffect(() => {
    driverRef.current = new OllamaDriver({
      baseUrl: ollamaUrl,
      timeout: 60000,
      defaultModel: model
    });

    // Check if Ollama is running
    driverRef.current.getCapabilities()
      .then(() => {
        setMessages((prev) => [...prev, {
          role: 'system',
          content: `✓ Connected to Ollama at ${ollamaUrl}`,
          timestamp: new Date(),
        }]);
      })
      .catch((error) => {
        setMessages((prev) => [...prev, {
          role: 'system',
          content: `✗ Failed to connect to Ollama: ${error.message}\n\nMake sure Ollama is running: ollama serve`,
          timestamp: new Date(),
        }]);
      });
  }, [ollamaUrl, model]);

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      exit();
    }
  });

  const handleSubmit = async (value: string) => {
    if (!value.trim() || isProcessing || !driverRef.current) return;

    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: value,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);
    setCurrentResponse('');

    try {
      // Build conversation history
      const chatMessages: ChatMessage[] = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role,
          content: m.content,
        }));

      chatMessages.push({ role: 'user', content: value });

      // Stream response from Ollama
      let fullResponse = '';
      for await (const chunk of driverRef.current.chatStream({
        messages: chatMessages,
        sessionId: sessionId,
        policy: {
          approvals: ApprovalsLevel.NEVER,
          trust: TrustLevel.SANDBOXED,
          guardStrict: false
        }
      })) {
        if (chunk.delta) {
          fullResponse += chunk.delta;
          setCurrentResponse(fullResponse);
        }
      }

      // Add complete response to messages
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: fullResponse,
        timestamp: new Date(),
      }]);
      setCurrentResponse('');
    } catch (error) {
      setMessages((prev) => [...prev, {
        role: 'system',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box borderStyle="round" borderColor="cyan" paddingX={1} marginBottom={1}>
        <Text bold color="cyan">
          AIRIS Code - Ollama Chat
        </Text>
      </Box>

      {/* Chat Messages */}
      <Box flexDirection="column" marginBottom={1}>
        {messages.map((msg, index) => (
          <Box key={index} flexDirection="column" marginBottom={1}>
            <Box>
              <Text bold color={
                msg.role === 'user' ? 'green' :
                msg.role === 'assistant' ? 'blue' : 'gray'
              }>
                {msg.role === 'user' ? '❯ You' :
                 msg.role === 'assistant' ? '🤖 Assistant' : 'ℹ System'}
              </Text>
              <Text dimColor> {msg.timestamp.toLocaleTimeString()}</Text>
            </Box>
            <Box paddingLeft={2}>
              <Text>{msg.content}</Text>
            </Box>
          </Box>
        ))}

        {/* Streaming response */}
        {currentResponse && (
          <Box flexDirection="column" marginBottom={1}>
            <Box>
              <Text bold color="blue">🤖 Assistant</Text>
              <Text dimColor> (typing...)</Text>
            </Box>
            <Box paddingLeft={2}>
              <Text>{currentResponse}</Text>
            </Box>
          </Box>
        )}
      </Box>

      {/* Input Area */}
      <Box borderStyle="single" borderColor="yellow" paddingX={1}>
        <Text bold color="yellow">❯ </Text>
        {isProcessing ? (
          <Text dimColor>Processing...</Text>
        ) : (
          <TextInput
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            placeholder="Enter your coding task..."
          />
        )}
      </Box>

      {/* Footer */}
      <Box marginTop={1}>
        <Text dimColor>
          Press Ctrl+C to exit | Model: {model} | Session: {sessionId.slice(0, 8)}
        </Text>
      </Box>
    </Box>
  );
};
