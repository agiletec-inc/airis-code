/**
 * @license
 * Copyright 2025 AIRIS Code
 * SPDX-License-Identifier: MIT
 */

import React, { useState, useEffect, useMemo } from "react";
import { Box, Text, useInput, useApp } from "ink";
import type { ContentGenerator } from "@airiscode/core-gemini";
import { SessionStorage, type Message } from "./sessionStorage.js";

interface MinimalAppProps {
  contentGenerator: ContentGenerator;
}

export const MinimalApp: React.FC<MinimalAppProps> = ({ contentGenerator }) => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentResponse, setCurrentResponse] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const { exit } = useApp();

  // Initialize session storage
  const sessionStorage = useMemo(() => new SessionStorage(), []);

  // Load messages from session on mount
  useEffect(() => {
    const savedMessages = sessionStorage.loadMessages();
    if (savedMessages.length > 0) {
      setMessages(savedMessages);
    }
  }, [sessionStorage]);

  // Save messages to session when they change
  useEffect(() => {
    // Skip initial load
    if (messages.length === 0) return;

    // Save only the last message (newly added)
    const lastMessage = messages[messages.length - 1];
    if (lastMessage) {
      sessionStorage.appendMessage(lastMessage);
    }
  }, [messages, sessionStorage]);

  useInput((inputKey, inputInfo) => {
    // Disable input during streaming
    if (isStreaming) {
      if (inputInfo.ctrl && inputKey === "c") {
        exit();
      }
      return;
    }

    if (inputInfo.ctrl && inputKey === "c") {
      exit();
      return;
    }

    if (inputKey === "return") {
      handleSubmit();
      return;
    }

    if (inputKey === "backspace" || inputKey === "delete") {
      setInput((prev) => prev.slice(0, -1));
      return;
    }

    if (inputKey.length === 1 && !inputInfo.ctrl && !inputInfo.meta) {
      setInput((prev) => prev + inputKey);
    }
  });

  const handleSubmit = async () => {
    const userInput = input.trim();
    if (!userInput) return;

    setInput("");
    setCurrentResponse("");
    setIsStreaming(true);

    // Add user message to history
    const userMessage: Message = {
      role: "user",
      content: userInput,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Build messages array for multi-turn conversation
    const conversationMessages = [
      ...messages,
      userMessage,
    ].map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Buffering strategy: accumulate chunks and flush periodically
    let buffer = "";
    let fullResponse = "";
    let lastFlushTime = Date.now();
    const FLUSH_INTERVAL_MS = 50;

    const flushBuffer = () => {
      if (buffer.length > 0) {
        fullResponse += buffer;
        setCurrentResponse(fullResponse);
        buffer = "";
        lastFlushTime = Date.now();
      }
    };

    try {
      const stream = await contentGenerator.generateContentStream({
        messages: conversationMessages,
      });

      for await (const chunk of stream) {
        buffer += chunk.content;

        // Flush buffer every FLUSH_INTERVAL_MS or when buffer is large
        const now = Date.now();
        if (now - lastFlushTime >= FLUSH_INTERVAL_MS || buffer.length > 100) {
          flushBuffer();
        }
      }

      // Final flush
      flushBuffer();

      // Add assistant message to history
      const assistantMessage: Message = {
        role: "assistant",
        content: fullResponse,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setCurrentResponse("");
    } catch (error) {
      // Preserve partial response on error
      flushBuffer();
      const errorMsg = `\n\n❌ Error: ${error instanceof Error ? error.message : String(error)}`;
      const finalResponse = fullResponse ? fullResponse + errorMsg : errorMsg.trim();

      setCurrentResponse(finalResponse);

      // Add error message to history
      const assistantMessage: Message = {
        role: "assistant",
        content: finalResponse,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setIsStreaming(false);
    }
  };

  // Show last 3 conversation turns (6 messages)
  const recentMessages = messages.slice(-6);

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          AIRIS Code - Streaming Interface
        </Text>
        {messages.length > 0 && (
          <Text dimColor> ({Math.floor(messages.length / 2)} turns)</Text>
        )}
        <Text dimColor> | Session: {sessionStorage.getSessionId()}</Text>
      </Box>

      {/* Conversation history */}
      {recentMessages.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          {recentMessages.map((msg, idx) => (
            <Box key={idx} marginBottom={idx < recentMessages.length - 1 ? 1 : 0}>
              <Box>
                <Text bold color={msg.role === "user" ? "green" : "blue"}>
                  {msg.role === "user" ? "You" : "Assistant"}:{" "}
                </Text>
              </Box>
              <Box paddingLeft={2}>
                <Text>{msg.content}</Text>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {/* Current streaming response */}
      {currentResponse && (
        <Box flexDirection="column" marginBottom={1}>
          <Box>
            <Text bold color="blue">
              Assistant:{" "}
            </Text>
            {isStreaming && <Text color="yellow">● Streaming...</Text>}
          </Box>
          <Box paddingLeft={2} borderStyle="single" borderColor="gray" padding={1}>
            <Text>{currentResponse}</Text>
          </Box>
        </Box>
      )}

      {/* Input prompt */}
      <Box marginTop={1}>
        <Text bold color="green">
          &gt;{" "}
        </Text>
        <Text>{input}</Text>
        {!isStreaming && <Text color="gray">_</Text>}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>
          {isStreaming
            ? "Streaming in progress (Ctrl+C to exit)"
            : "Type your message and press Enter (Ctrl+C to exit)"}
        </Text>
      </Box>
    </Box>
  );
};
