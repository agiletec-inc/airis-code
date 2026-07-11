/**
 * Self-hosted LLM type definitions.
 *
 * Structurally compatible with @google/genai to ease migration, but authored
 * by airiscode. The runtime functions here (createUserContent, createModelContent,
 * mcpToTool) and runtime classes (GenerateContentResponse, ApiError) are minimal
 * implementations; they will be replaced by proper driver-based implementations
 * in Phase 2.
 *
 * The goal of this file is purely to eliminate the `@google/genai` dependency.
 * Types are permissive (many `any`/`unknown`) — correctness is enforced at the
 * driver layer, not here.
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/**
 * FinishReason — kept as a const object with string values to allow permissive
 * assignment from arbitrary driver responses (union is widened to `string`).
 * Consumers can still reference FinishReason.STOP for well-known values.
 */
export const FinishReason = {
  FINISH_REASON_UNSPECIFIED: "FINISH_REASON_UNSPECIFIED",
  STOP: "STOP",
  MAX_TOKENS: "MAX_TOKENS",
  SAFETY: "SAFETY",
  RECITATION: "RECITATION",
  LANGUAGE: "LANGUAGE",
  OTHER: "OTHER",
  BLOCKLIST: "BLOCKLIST",
  PROHIBITED_CONTENT: "PROHIBITED_CONTENT",
  SPII: "SPII",
  MALFORMED_FUNCTION_CALL: "MALFORMED_FUNCTION_CALL",
  IMAGE_SAFETY: "IMAGE_SAFETY",
  UNEXPECTED_TOOL_CALL: "UNEXPECTED_TOOL_CALL",
  IMAGE_PROHIBITED_CONTENT: "IMAGE_PROHIBITED_CONTENT",
  NO_IMAGE: "NO_IMAGE",
} as const;
export type FinishReason = string;

export enum Type {
  TYPE_UNSPECIFIED = "TYPE_UNSPECIFIED",
  STRING = "STRING",
  NUMBER = "NUMBER",
  INTEGER = "INTEGER",
  BOOLEAN = "BOOLEAN",
  ARRAY = "ARRAY",
  OBJECT = "OBJECT",
  NULL = "NULL",
}

export enum HarmCategory {
  HARM_CATEGORY_UNSPECIFIED = "HARM_CATEGORY_UNSPECIFIED",
  HARM_CATEGORY_HATE_SPEECH = "HARM_CATEGORY_HATE_SPEECH",
  HARM_CATEGORY_SEXUALLY_EXPLICIT = "HARM_CATEGORY_SEXUALLY_EXPLICIT",
  HARM_CATEGORY_HARASSMENT = "HARM_CATEGORY_HARASSMENT",
  HARM_CATEGORY_DANGEROUS_CONTENT = "HARM_CATEGORY_DANGEROUS_CONTENT",
}

export enum HarmBlockThreshold {
  HARM_BLOCK_THRESHOLD_UNSPECIFIED = "HARM_BLOCK_THRESHOLD_UNSPECIFIED",
  BLOCK_LOW_AND_ABOVE = "BLOCK_LOW_AND_ABOVE",
  BLOCK_MEDIUM_AND_ABOVE = "BLOCK_MEDIUM_AND_ABOVE",
  BLOCK_ONLY_HIGH = "BLOCK_ONLY_HIGH",
  BLOCK_NONE = "BLOCK_NONE",
}

export enum BlockedReason {
  BLOCKED_REASON_UNSPECIFIED = "BLOCKED_REASON_UNSPECIFIED",
  SAFETY = "SAFETY",
  OTHER = "OTHER",
}

export enum Modality {
  MODALITY_UNSPECIFIED = "MODALITY_UNSPECIFIED",
  TEXT = "TEXT",
  IMAGE = "IMAGE",
  AUDIO = "AUDIO",
  VIDEO = "VIDEO",
  DOCUMENT = "DOCUMENT",
}

// ---------------------------------------------------------------------------
// Schema types
// ---------------------------------------------------------------------------

export interface Schema {
  type?: Type | string;
  format?: string;
  description?: string;
  nullable?: boolean;
  enum?: string[];
  maxItems?: string | number;
  minItems?: string | number;
  properties?: Record<string, Schema>;
  required?: string[];
  items?: Schema;
  anyOf?: Schema[];
  propertyOrdering?: string[];
  default?: unknown;
  title?: string;
  example?: unknown;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Content / Part
// ---------------------------------------------------------------------------

export interface FunctionCall {
  id?: string;
  name?: string;
  args?: Record<string, unknown>;
}

export interface FunctionResponse {
  id?: string;
  name?: string;
  response?: Record<string, unknown>;
  /**
   * Optional media parts (images, files) that accompany the text response.
   * Used by drivers that support mixed-content tool results (e.g. Anthropic).
   */
  parts?: Part[];
}

export interface InlineData {
  mimeType?: string;
  data?: string;
  displayName?: string;
}

export interface FileData {
  mimeType?: string;
  fileUri?: string;
  displayName?: string;
}

export interface ExecutableCode {
  language?: string;
  code?: string;
}

export interface CodeExecutionResult {
  outcome?: string;
  output?: string;
}

export interface Part {
  text?: string;
  thought?: boolean;
  thoughtSignature?: string;
  inlineData?: InlineData;
  fileData?: FileData;
  functionCall?: FunctionCall;
  functionResponse?: FunctionResponse;
  executableCode?: ExecutableCode;
  codeExecutionResult?: CodeExecutionResult;
  videoMetadata?: unknown;
  [key: string]: unknown;
}

/** A Part that specifically carries a functionResponse. */
export interface FunctionResponsePart extends Part {
  functionResponse: FunctionResponse;
}

export type PartUnion = Part | string;
export type PartListUnion = PartUnion | PartUnion[];

export interface Content {
  role?: string;
  parts?: Part[];
}

export type ContentUnion = Content | PartUnion | PartUnion[];
export type ContentListUnion = ContentUnion | ContentUnion[];

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

export interface FunctionDeclaration {
  name?: string;
  description?: string;
  parameters?: Schema;
  parametersJsonSchema?: unknown;
  response?: Schema;
  responseJsonSchema?: unknown;
}

export interface Tool {
  functionDeclarations?: FunctionDeclaration[];
  googleSearch?: unknown;
  googleSearchRetrieval?: unknown;
  codeExecution?: unknown;
  retrieval?: unknown;
  urlContext?: unknown;
  [key: string]: unknown;
}

export type ToolUnion = Tool;
export type ToolListUnion = Tool[] | CallableTool[] | Array<Tool | CallableTool>;

export interface ToolConfig {
  functionCallingConfig?: {
    mode?: string;
    allowedFunctionNames?: string[];
  };
}

export interface ToolUseConfig {
  [key: string]: unknown;
}

/**
 * CallableTool — structural shape for a tool that can be invoked directly.
 * In @google/genai, this has `tool()` and `callTool()` methods.
 */
export interface CallableTool {
  tool: () => Promise<Tool>;
  callTool: (functionCalls: FunctionCall[]) => Promise<Part[]>;
}

// ---------------------------------------------------------------------------
// Safety / Generation config
// ---------------------------------------------------------------------------

export interface SafetySetting {
  category?: HarmCategory | string;
  threshold?: HarmBlockThreshold | string;
  method?: string;
}

export interface SafetyRating {
  category?: HarmCategory | string;
  probability?: string;
  probabilityScore?: number;
  severity?: string;
  severityScore?: number;
  blocked?: boolean;
}

export interface CitationMetadata {
  citations?: unknown[];
}

export interface ContentEmbedding {
  values?: number[];
  statistics?: unknown;
}

export interface GenerationConfig {
  temperature?: number;
  topP?: number;
  topK?: number;
  candidateCount?: number;
  maxOutputTokens?: number;
  stopSequences?: string[];
  responseMimeType?: string;
  responseSchema?: Schema;
  responseJsonSchema?: unknown;
  seed?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
}

export interface ThinkingConfig {
  includeThoughts?: boolean;
  thinkingBudget?: number;
}

export interface GenerateContentConfig {
  systemInstruction?: ContentUnion;
  temperature?: number;
  topP?: number;
  topK?: number;
  candidateCount?: number;
  maxOutputTokens?: number;
  stopSequences?: string[];
  responseMimeType?: string;
  responseSchema?: Schema;
  responseJsonSchema?: unknown;
  seed?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  tools?: ToolListUnion;
  toolConfig?: ToolConfig;
  safetySettings?: SafetySetting[];
  thinkingConfig?: ThinkingConfig;
  abortSignal?: AbortSignal;
  labels?: Record<string, string>;
  cachedContent?: string;
  httpOptions?: unknown;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Request / Response shapes
// ---------------------------------------------------------------------------

export interface GenerateContentParameters {
  model: string;
  contents: ContentListUnion;
  config?: GenerateContentConfig;
}

export interface SendMessageParameters {
  message: PartListUnion;
  config?: GenerateContentConfig;
}

export interface CountTokensParameters {
  model: string;
  contents: ContentListUnion;
  config?: unknown;
}

export interface CountTokensResponse {
  totalTokens?: number;
  cachedContentTokenCount?: number;
}

export interface EmbedContentParameters {
  model: string;
  contents: ContentListUnion;
  config?: unknown;
}

export interface EmbedContentResponse {
  embeddings?: ContentEmbedding[];
  metadata?: unknown;
}

export interface GenerateContentResponseUsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
  cachedContentTokenCount?: number;
  thoughtsTokenCount?: number;
  toolUsePromptTokenCount?: number;
  promptTokensDetails?: Array<{ modality?: string; tokenCount?: number }>;
  cacheTokensDetails?: Array<{ modality?: string; tokenCount?: number }>;
  candidatesTokensDetails?: Array<{ modality?: string; tokenCount?: number }>;
}

export interface Candidate {
  content?: Content;
  finishReason?: FinishReason | string;
  finishMessage?: string;
  index?: number;
  safetyRatings?: SafetyRating[];
  citationMetadata?: CitationMetadata;
  tokenCount?: number;
  groundingMetadata?: unknown;
  urlContextMetadata?: unknown;
  logprobsResult?: unknown;
}

export interface PromptFeedback {
  blockReason?: BlockedReason | string;
  blockReasonMessage?: string;
  safetyRatings?: SafetyRating[];
}

/**
 * GenerateContentResponse — constructable class (matches @google/genai shape).
 * Consumers do `new GenerateContentResponse()` and then mutate fields.
 * The `text` getter mirrors google's convenience accessor.
 */
export class GenerateContentResponse {
  candidates?: Candidate[];
  usageMetadata?: GenerateContentResponseUsageMetadata;
  promptFeedback?: PromptFeedback;
  modelVersion?: string;
  responseId?: string;
  createTime?: string;
  automaticFunctionCallingHistory?: Content[];
  parsed?: unknown;

  /** Convenience getter matching @google/genai: concatenated text from first candidate. */
  get text(): string | undefined {
    const parts = this.candidates?.[0]?.content?.parts;
    if (!parts || parts.length === 0) return undefined;
    const texts = parts
      .filter((p) => typeof p.text === "string" && !p.thought)
      .map((p) => p.text as string);
    if (texts.length === 0) return undefined;
    return texts.join("");
  }

  /** Convenience getter matching @google/genai: function calls from first candidate. */
  get functionCalls(): FunctionCall[] | undefined {
    const parts = this.candidates?.[0]?.content?.parts;
    if (!parts) return undefined;
    const calls = parts.filter((p) => p.functionCall).map((p) => p.functionCall as FunctionCall);
    return calls.length > 0 ? calls : undefined;
  }

  /** Convenience getter: executable code from first candidate. */
  get executableCode(): string | undefined {
    return this.candidates?.[0]?.content?.parts?.find((p) => p.executableCode)?.executableCode
      ?.code;
  }

  /** Convenience getter: code execution result from first candidate. */
  get codeExecutionResult(): string | undefined {
    return this.candidates?.[0]?.content?.parts?.find((p) => p.codeExecutionResult)
      ?.codeExecutionResult?.output;
  }

  /** Convenience getter: inline data (e.g. generated image) from first candidate. */
  get data(): string | undefined {
    return this.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData?.data;
  }
}

// ---------------------------------------------------------------------------
// Error class (shape-compatible with @google/genai ApiError)
// ---------------------------------------------------------------------------

export interface ApiErrorInit {
  message: string;
  status?: number;
}

export class ApiError extends Error {
  status?: number;

  constructor(init: ApiErrorInit) {
    super(init.message);
    this.name = "ApiError";
    this.status = init.status;
  }
}

// ---------------------------------------------------------------------------
// Runtime helpers
// ---------------------------------------------------------------------------

function partsFromPartListUnion(parts: PartListUnion): Part[] {
  if (typeof parts === "string") return [{ text: parts }];
  if (Array.isArray(parts)) {
    return parts.map((p) => (typeof p === "string" ? { text: p } : p));
  }
  return [parts];
}

/**
 * Build a user-role Content from loose parts input.
 * Mirrors @google/genai createUserContent semantics just closely enough
 * for our consumers. Proper handling lives in driver implementations.
 */
export function createUserContent(parts: PartListUnion): Content {
  return { role: "user", parts: partsFromPartListUnion(parts) };
}

/**
 * Build a model-role Content from loose parts input.
 */
export function createModelContent(parts: PartListUnion): Content {
  return { role: "model", parts: partsFromPartListUnion(parts) };
}

/**
 * TODO: Replace with proper MCP-to-driver tool conversion in Phase 2.
 * Current behavior: returns a minimal CallableTool-shaped wrapper around an
 * MCP client. The actual tool call routing is handled by the MCP session
 * layer, so this shim only needs to satisfy the type and not break existing
 * callers that pass the result through to driver adapters.
 */
export function mcpToTool(mcpClient: unknown, _options?: unknown): CallableTool {
  return {
    tool: async (): Promise<Tool> => ({ functionDeclarations: [] }),
    callTool: async (_functionCalls: FunctionCall[]): Promise<Part[]> => {
      throw new Error("mcpToTool runtime shim is not wired up; use the MCP session layer instead.");
    },
    // Preserve reference for downstream shims that may inspect it.
    ...(mcpClient && typeof mcpClient === "object" ? { __mcpClient: mcpClient } : {}),
  } as CallableTool;
}
