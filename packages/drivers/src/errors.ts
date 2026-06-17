/**
 * Error classes for model drivers
 */

/**
 * Base error for driver-related issues
 */
export class DriverError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "DriverError";
  }
}

/**
 * Error when driver initialization fails
 */
export class DriverInitError extends DriverError {
  constructor(message: string) {
    super(message, "DRIVER_INIT_ERROR");
    this.name = "DriverInitError";
  }
}

/**
 * Error when API request fails
 */
export class DriverAPIError extends DriverError {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly response?: unknown,
  ) {
    super(message, "DRIVER_API_ERROR");
    this.name = "DriverAPIError";
  }
}

/**
 * Error when request times out
 */
export class DriverTimeoutError extends DriverError {
  constructor(message: string = "Request timed out") {
    super(message, "DRIVER_TIMEOUT_ERROR");
    this.name = "DriverTimeoutError";
  }
}

/**
 * Error when model is not available
 */
export class ModelNotFoundError extends DriverError {
  constructor(model: string) {
    super(`Model not found: ${model}`, "MODEL_NOT_FOUND");
    this.name = "ModelNotFoundError";
  }
}

/**
 * Error when tool calling is not supported
 */
export class ToolsNotSupportedError extends DriverError {
  constructor() {
    super("Tools/function calling is not supported by this driver", "TOOLS_NOT_SUPPORTED");
    this.name = "ToolsNotSupportedError";
  }
}
