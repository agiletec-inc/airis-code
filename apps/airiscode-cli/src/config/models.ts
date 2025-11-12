/**
 * Model configuration for role-based execution
 */

export interface RoleModelConfig {
  /** Model for planning and architecture decisions */
  planner: string;
  /** Model for implementation and coding tasks */
  implementer: string;
  /** Model for code review and validation */
  reviewer?: string;
  /** Model for testing and verification */
  tester?: string;
}

/**
 * Recommended model configurations by performance tier
 */
export const MODEL_PRESETS: Record<string, RoleModelConfig> = {
  // High performance - best quality, slower
  premium: {
    planner: 'qwen2.5-coder:32b',
    implementer: 'qwen2.5-coder:7b',
    reviewer: 'qwen2.5-coder:14b',
    tester: 'qwen2.5-coder:7b',
  },

  // Balanced - good quality, reasonable speed
  balanced: {
    planner: 'qwen2.5-coder:14b',
    implementer: 'qwen2.5-coder:7b',
    reviewer: 'qwen2.5-coder:7b',
    tester: 'qwen2.5:3b',
  },

  // Fast - lower quality, maximum speed
  fast: {
    planner: 'qwen2.5-coder:7b',
    implementer: 'qwen2.5:3b',
    reviewer: 'qwen2.5:3b',
    tester: 'qwen2.5:3b',
  },

  // Development - using currently available models
  dev: {
    planner: 'codegeex4',
    implementer: 'qwen2.5:3b',
    reviewer: 'llama3.2:3b',
  },
};

/**
 * Get model for specific role
 */
export function getModelForRole(
  role: 'planner' | 'implementer' | 'reviewer' | 'tester',
  preset: string = 'balanced'
): string {
  const config = MODEL_PRESETS[preset] || MODEL_PRESETS.balanced;
  return config[role] || config.implementer;
}

/**
 * Model metadata for display and selection
 */
export interface ModelInfo {
  name: string;
  size: string;
  description: string;
  recommended: boolean;
  roles: Array<'planner' | 'implementer' | 'reviewer' | 'tester'>;
}

export const KNOWN_MODELS: ModelInfo[] = [
  {
    name: 'qwen2.5-coder:32b',
    size: '19GB',
    description: 'Best for planning and architecture',
    recommended: true,
    roles: ['planner', 'reviewer'],
  },
  {
    name: 'qwen2.5-coder:14b',
    size: '8GB',
    description: 'Balanced planning and implementation',
    recommended: true,
    roles: ['planner', 'implementer', 'reviewer'],
  },
  {
    name: 'qwen2.5-coder:7b',
    size: '4.5GB',
    description: 'Fast implementation and coding',
    recommended: true,
    roles: ['implementer', 'reviewer', 'tester'],
  },
  {
    name: 'qwen2.5:3b',
    size: '1.9GB',
    description: 'Ultra-fast for simple tasks',
    recommended: true,
    roles: ['implementer', 'tester'],
  },
  {
    name: 'deepseek-coder:33b',
    size: '19GB',
    description: 'Alternative high-quality planner',
    recommended: false,
    roles: ['planner'],
  },
  {
    name: 'codegeex4',
    size: '5.5GB',
    description: 'Code generation specialist',
    recommended: false,
    roles: ['implementer'],
  },
];
