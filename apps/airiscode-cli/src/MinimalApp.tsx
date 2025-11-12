/**
 * @license
 * Copyright 2025 AIRIS Code
 * SPDX-License-Identifier: MIT
 */

import React, { useState, useEffect } from "react";
import { Box, Text, useInput, useApp } from "ink";
import type { ContentGenerator } from "@airiscode/core-gemini";

interface MinimalAppProps {
  contentGenerator: ContentGenerator;
}

export const MinimalApp: React.FC<MinimalAppProps> = ({ contentGenerator }) => {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { exit } = useApp();

  useInput((inputKey, input) => {
    if (input.ctrl && inputKey === "c") {
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

    if (inputKey.length === 1 && !input.ctrl && !input.meta) {
      setInput((prev) => prev + inputKey);
    }
  });

  const handleSubmit = async () => {
    const userInput = input;
    setInput("");
    setIsLoading(true);

    try {
      const result = await contentGenerator.generateContent({
        prompt: userInput,
      });

      setResponse(result.content);
    } catch (error) {
      setResponse(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          AIRIS Code - Minimal Interface
        </Text>
      </Box>

      {response && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold>Response:</Text>
          <Text>{response}</Text>
        </Box>
      )}

      {isLoading && (
        <Box marginBottom={1}>
          <Text color="yellow">Generating response...</Text>
        </Box>
      )}

      <Box>
        <Text bold color="green">
          &gt;{" "}
        </Text>
        <Text>{input}</Text>
        <Text color="gray">_</Text>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Press Ctrl+C to exit</Text>
      </Box>
    </Box>
  );
};
