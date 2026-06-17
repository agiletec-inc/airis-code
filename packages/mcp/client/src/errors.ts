/**
 * MCP client error classes
 */

/**
 * Base error for MCP client issues
 */
export class McpError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "McpError";
  }
}

/**
 * Error when MCP connection fails
 */
export class McpConnectionError extends McpError {
  constructor(
    message: string,
    public readonly url?: string,
  ) {
    super(message, "MCP_CONNECTION_ERROR");
    this.name = "McpConnectionError";
  }
}

/**
 * Error when tool is not found
 */
export class McpToolNotFoundError extends McpError {
  constructor(toolName: string) {
    super(`Tool not found: ${toolName}`, "MCP_TOOL_NOT_FOUND");
    this.name = "McpToolNotFoundError";
  }
}

/**
 * Error when tool invocation fails
 */
export class McpInvocationError extends McpError {
  constructor(
    message: string,
    public readonly toolName: string,
    public readonly details?: unknown,
  ) {
    super(message, "MCP_INVOCATION_ERROR");
    this.name = "McpInvocationError";
  }
}

/**
 * Error when request times out
 */
export class McpTimeoutError extends McpError {
  constructor(message: string = "MCP request timed out") {
    super(message, "MCP_TIMEOUT_ERROR");
    this.name = "McpTimeoutError";
  }
}

/**
 * Error when server is unavailable
 */
export class McpServerError extends McpError {
  constructor(
    message: string,
    public readonly server?: string,
    public readonly statusCode?: number,
  ) {
    super(message, "MCP_SERVER_ERROR");
    this.name = "McpServerError";
  }
}
