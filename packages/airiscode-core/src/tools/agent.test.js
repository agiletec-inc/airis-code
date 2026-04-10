/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentTool } from './agent.js';
import { ToolConfirmationOutcome } from './tools.js';
import { SubagentManager } from '../subagents/subagent-manager.js';
import { AgentTerminateMode } from '../agents/runtime/agent-types.js';
import { ContextState, } from '../agents/runtime/agent-headless.js';
import { AgentEventType } from '../agents/runtime/agent-events.js';
import { partToString } from '../utils/partUtils.js';
import { PermissionMode } from '../hooks/types.js';
// Mock dependencies
vi.mock('../subagents/subagent-manager.js');
vi.mock('../agents/runtime/agent-headless.js');
const MockedSubagentManager = vi.mocked(SubagentManager);
const MockedContextState = vi.mocked(ContextState);
describe('AgentTool', () => {
    let config;
    let agentTool;
    let mockSubagentManager;
    let changeListeners;
    const mockSubagents = [
        {
            name: 'file-search',
            description: 'Specialized agent for searching and analyzing files',
            systemPrompt: 'You are a file search specialist.',
            level: 'project',
            filePath: '/project/.airiscode/agents/file-search.md',
        },
        {
            name: 'code-review',
            description: 'Agent for reviewing code quality and best practices',
            systemPrompt: 'You are a code review specialist.',
            level: 'user',
            filePath: '/home/user/.airiscode/agents/code-review.md',
        },
    ];
    beforeEach(async () => {
        // Setup fake timers
        vi.useFakeTimers();
        // Create mock config
        config = {
            getProjectRoot: vi.fn().mockReturnValue('/test/project'),
            getSessionId: vi.fn().mockReturnValue('test-session-id'),
            getSubagentManager: vi.fn(),
            getGeminiClient: vi.fn().mockReturnValue(undefined),
            getHookSystem: vi.fn().mockReturnValue(undefined),
            getTranscriptPath: vi.fn().mockReturnValue('/test/transcript'),
        };
        changeListeners = [];
        // Setup SubagentManager mock
        mockSubagentManager = {
            listSubagents: vi.fn().mockResolvedValue(mockSubagents),
            loadSubagent: vi.fn(),
            createAgentHeadless: vi.fn(),
            addChangeListener: vi.fn((listener) => {
                changeListeners.push(listener);
                return () => {
                    const index = changeListeners.indexOf(listener);
                    if (index >= 0) {
                        changeListeners.splice(index, 1);
                    }
                };
            }),
        };
        MockedSubagentManager.mockImplementation(() => mockSubagentManager);
        // Make config return the mock SubagentManager
        vi.mocked(config.getSubagentManager).mockReturnValue(mockSubagentManager);
        // Create AgentTool instance
        agentTool = new AgentTool(config);
        // Allow async initialization to complete
        await vi.runAllTimersAsync();
    });
    afterEach(() => {
        vi.useRealTimers();
    });
    describe('initialization', () => {
        it('should initialize with correct name and properties', () => {
            expect(agentTool.name).toBe('agent');
            expect(agentTool.displayName).toBe('Agent');
            expect(agentTool.kind).toBe('other');
        });
        it('should load available subagents during initialization', () => {
            expect(mockSubagentManager.listSubagents).toHaveBeenCalled();
        });
        it('should subscribe to subagent manager changes', () => {
            expect(mockSubagentManager.addChangeListener).toHaveBeenCalledTimes(1);
        });
        it('should update description with available subagents', () => {
            expect(agentTool.description).toContain('file-search');
            expect(agentTool.description).toContain('Specialized agent for searching and analyzing files');
            expect(agentTool.description).toContain('code-review');
            expect(agentTool.description).toContain('Agent for reviewing code quality and best practices');
        });
        it('should handle empty subagents list gracefully', async () => {
            vi.mocked(mockSubagentManager.listSubagents).mockResolvedValue([]);
            const emptyAgentTool = new AgentTool(config);
            await vi.runAllTimersAsync();
            expect(emptyAgentTool.description).toContain('No subagents are currently configured');
        });
        it('should handle subagent loading errors gracefully', async () => {
            vi.mocked(mockSubagentManager.listSubagents).mockRejectedValue(new Error('Loading failed'));
            const failedAgentTool = new AgentTool(config);
            await vi.runAllTimersAsync();
            // Should fall back to built-in agents instead of showing "no subagents"
            expect(failedAgentTool.description).toContain('general-purpose');
            expect(failedAgentTool.description).toContain('Explore');
        });
    });
    describe('schema generation', () => {
        it('should generate schema with subagent names as enum', () => {
            const schema = agentTool.schema;
            const properties = schema.parametersJsonSchema;
            expect(properties.properties.subagent_type.enum).toEqual([
                'file-search',
                'code-review',
            ]);
        });
        it('should generate schema without enum when no subagents available', async () => {
            vi.mocked(mockSubagentManager.listSubagents).mockResolvedValue([]);
            const emptyAgentTool = new AgentTool(config);
            await vi.runAllTimersAsync();
            const schema = emptyAgentTool.schema;
            const properties = schema.parametersJsonSchema;
            expect(properties.properties.subagent_type.enum).toBeUndefined();
        });
    });
    describe('validateToolParams', () => {
        const validParams = {
            description: 'Search files',
            prompt: 'Find all TypeScript files in the project',
            subagent_type: 'file-search',
        };
        it('should validate valid parameters', async () => {
            const result = agentTool.validateToolParams(validParams);
            expect(result).toBeNull();
        });
        it('should reject empty description', async () => {
            const result = agentTool.validateToolParams({
                ...validParams,
                description: '',
            });
            expect(result).toBe('Parameter "description" must be a non-empty string.');
        });
        it('should reject empty prompt', async () => {
            const result = agentTool.validateToolParams({
                ...validParams,
                prompt: '',
            });
            expect(result).toBe('Parameter "prompt" must be a non-empty string.');
        });
        it('should reject empty subagent_type', async () => {
            const result = agentTool.validateToolParams({
                ...validParams,
                subagent_type: '',
            });
            expect(result).toBe('Parameter "subagent_type" must be a non-empty string.');
        });
        it('should reject non-existent subagent', async () => {
            const result = agentTool.validateToolParams({
                ...validParams,
                subagent_type: 'non-existent',
            });
            expect(result).toBe('Subagent "non-existent" not found. Available subagents: file-search, code-review');
        });
    });
    describe('refreshSubagents', () => {
        it('should refresh when change listener fires', async () => {
            const newSubagents = [
                {
                    name: 'new-agent',
                    description: 'A brand new agent',
                    systemPrompt: 'Do new things.',
                    level: 'project',
                    filePath: '/project/.airiscode/agents/new-agent.md',
                },
            ];
            vi.mocked(mockSubagentManager.listSubagents).mockResolvedValueOnce(newSubagents);
            const listener = changeListeners[0];
            expect(listener).toBeDefined();
            listener?.();
            await vi.runAllTimersAsync();
            expect(agentTool.description).toContain('new-agent');
            expect(agentTool.description).toContain('A brand new agent');
        });
        it('should refresh available subagents and update description', async () => {
            const newSubagents = [
                {
                    name: 'test-agent',
                    description: 'A test agent',
                    systemPrompt: 'Test prompt',
                    level: 'project',
                    filePath: '/project/.airiscode/agents/test-agent.md',
                },
            ];
            vi.mocked(mockSubagentManager.listSubagents).mockResolvedValue(newSubagents);
            await agentTool.refreshSubagents();
            expect(agentTool.description).toContain('test-agent');
            expect(agentTool.description).toContain('A test agent');
        });
    });
    describe('AgentToolInvocation', () => {
        let mockAgent;
        let mockContextState;
        beforeEach(() => {
            mockAgent = {
                execute: vi.fn().mockResolvedValue(undefined),
                result: 'Task completed successfully',
                terminateMode: AgentTerminateMode.GOAL,
                getFinalText: vi.fn().mockReturnValue('Task completed successfully'),
                formatCompactResult: vi
                    .fn()
                    .mockReturnValue('✅ Success: Search files completed with GOAL termination'),
                getExecutionSummary: vi.fn().mockReturnValue({
                    rounds: 2,
                    totalDurationMs: 1500,
                    totalToolCalls: 3,
                    successfulToolCalls: 3,
                    failedToolCalls: 0,
                    successRate: 100,
                    inputTokens: 1000,
                    outputTokens: 500,
                    totalTokens: 1500,
                    toolUsage: [
                        {
                            name: 'grep',
                            count: 2,
                            success: 2,
                            failure: 0,
                            totalDurationMs: 800,
                            averageDurationMs: 400,
                        },
                        {
                            name: 'read_file',
                            count: 1,
                            success: 1,
                            failure: 0,
                            totalDurationMs: 200,
                            averageDurationMs: 200,
                        },
                    ],
                }),
                getStatistics: vi.fn().mockReturnValue({
                    rounds: 2,
                    totalDurationMs: 1500,
                    totalToolCalls: 3,
                    successfulToolCalls: 3,
                    failedToolCalls: 0,
                }),
                getTerminateMode: vi.fn().mockReturnValue(AgentTerminateMode.GOAL),
            };
            mockContextState = {
                set: vi.fn(),
            };
            MockedContextState.mockImplementation(() => mockContextState);
            vi.mocked(mockSubagentManager.loadSubagent).mockResolvedValue(mockSubagents[0]);
            vi.mocked(mockSubagentManager.createAgentHeadless).mockResolvedValue(mockAgent);
        });
        it('should execute subagent successfully', async () => {
            const params = {
                description: 'Search files',
                prompt: 'Find all TypeScript files',
                subagent_type: 'file-search',
            };
            const invocation = agentTool.createInvocation(params);
            const result = await invocation.execute();
            expect(mockSubagentManager.loadSubagent).toHaveBeenCalledWith('file-search');
            expect(mockSubagentManager.createAgentHeadless).toHaveBeenCalledWith(mockSubagents[0], config, expect.any(Object));
            expect(mockAgent.execute).toHaveBeenCalledWith(mockContextState, undefined);
            const llmText = partToString(result.llmContent);
            expect(llmText).toBe('Task completed successfully');
            const display = result.returnDisplay;
            expect(display.type).toBe('task_execution');
            expect(display.status).toBe('completed');
            expect(display.subagentName).toBe('file-search');
        });
        it('should handle subagent not found error', async () => {
            vi.mocked(mockSubagentManager.loadSubagent).mockResolvedValue(null);
            const params = {
                description: 'Search files',
                prompt: 'Find all TypeScript files',
                subagent_type: 'non-existent',
            };
            const invocation = agentTool.createInvocation(params);
            const result = await invocation.execute();
            const llmText = partToString(result.llmContent);
            expect(llmText).toContain('Subagent "non-existent" not found');
            const display = result.returnDisplay;
            expect(display.status).toBe('failed');
            expect(display.subagentName).toBe('non-existent');
        });
        it('should handle execution errors gracefully', async () => {
            vi.mocked(mockSubagentManager.createAgentHeadless).mockRejectedValue(new Error('Creation failed'));
            const params = {
                description: 'Search files',
                prompt: 'Find all TypeScript files',
                subagent_type: 'file-search',
            };
            const invocation = agentTool.createInvocation(params);
            const result = await invocation.execute();
            const llmText = partToString(result.llmContent);
            expect(llmText).toContain('Failed to run subagent: Creation failed');
            const display = result.returnDisplay;
            expect(display.status).toBe('failed');
        });
        it('should execute subagent without live output callback', async () => {
            const params = {
                description: 'Search files',
                prompt: 'Find all TypeScript files',
                subagent_type: 'file-search',
            };
            const invocation = agentTool.createInvocation(params);
            const result = await invocation.execute();
            // Verify that the task completed successfully
            expect(result.llmContent).toBeDefined();
            expect(result.returnDisplay).toBeDefined();
            // Verify the result has the expected structure
            const text = partToString(result.llmContent);
            expect(text).toBe('Task completed successfully');
            const display = result.returnDisplay;
            expect(display.status).toBe('completed');
            expect(display.subagentName).toBe('file-search');
        });
        it('should set context variables correctly', async () => {
            const params = {
                description: 'Search files',
                prompt: 'Find all TypeScript files',
                subagent_type: 'file-search',
            };
            const invocation = agentTool.createInvocation(params);
            await invocation.execute();
            expect(mockContextState.set).toHaveBeenCalledWith('task_prompt', 'Find all TypeScript files');
        });
        it('should return structured display object', async () => {
            const params = {
                description: 'Search files',
                prompt: 'Find all TypeScript files',
                subagent_type: 'file-search',
            };
            const invocation = agentTool.createInvocation(params);
            const result = await invocation.execute();
            expect(typeof result.returnDisplay).toBe('object');
            expect(result.returnDisplay).toHaveProperty('type', 'task_execution');
            expect(result.returnDisplay).toHaveProperty('subagentName', 'file-search');
            expect(result.returnDisplay).toHaveProperty('taskDescription', 'Search files');
            expect(result.returnDisplay).toHaveProperty('status', 'completed');
        });
        it('should not require confirmation', async () => {
            const params = {
                description: 'Search files',
                prompt: 'Find all TypeScript files',
                subagent_type: 'file-search',
            };
            const invocation = agentTool.createInvocation(params);
            const permission = await invocation.getDefaultPermission();
            expect(permission).toBe('allow');
        });
        it('should provide correct description', async () => {
            const params = {
                description: 'Search files',
                prompt: 'Find all TypeScript files',
                subagent_type: 'file-search',
            };
            const invocation = agentTool.createInvocation(params);
            const description = invocation.getDescription();
            expect(description).toBe('Search files');
        });
    });
    describe('SubagentStart hook integration', () => {
        let mockAgent;
        let mockContextState;
        let mockHookSystem;
        beforeEach(() => {
            mockAgent = {
                execute: vi.fn().mockResolvedValue(undefined),
                result: 'Task completed successfully',
                terminateMode: AgentTerminateMode.GOAL,
                getFinalText: vi.fn().mockReturnValue('Task completed successfully'),
                formatCompactResult: vi.fn().mockReturnValue('✅ Success'),
                getExecutionSummary: vi.fn().mockReturnValue({
                    rounds: 1,
                    totalDurationMs: 500,
                    totalToolCalls: 1,
                    successfulToolCalls: 1,
                    failedToolCalls: 0,
                    successRate: 100,
                    inputTokens: 100,
                    outputTokens: 50,
                    totalTokens: 150,
                    estimatedCost: 0.01,
                    toolUsage: [],
                }),
                getStatistics: vi.fn().mockReturnValue({
                    rounds: 1,
                    totalDurationMs: 500,
                    totalToolCalls: 1,
                    successfulToolCalls: 1,
                    failedToolCalls: 0,
                }),
                getTerminateMode: vi.fn().mockReturnValue(AgentTerminateMode.GOAL),
            };
            mockContextState = {
                set: vi.fn(),
            };
            MockedContextState.mockImplementation(() => mockContextState);
            vi.mocked(mockSubagentManager.loadSubagent).mockResolvedValue(mockSubagents[0]);
            vi.mocked(mockSubagentManager.createAgentHeadless).mockResolvedValue(mockAgent);
            mockHookSystem = {
                fireSubagentStartEvent: vi.fn().mockResolvedValue(undefined),
                fireSubagentStopEvent: vi.fn().mockResolvedValue(undefined),
            };
            vi.mocked(config.getGeminiClient).mockReturnValue(undefined);
            config['getHookSystem'] = vi
                .fn()
                .mockReturnValue(mockHookSystem);
            config['getTranscriptPath'] = vi
                .fn()
                .mockReturnValue('/test/transcript');
        });
        it('should call fireSubagentStartEvent before execution', async () => {
            const params = {
                description: 'Search files',
                prompt: 'Find all TypeScript files',
                subagent_type: 'file-search',
            };
            const invocation = agentTool.createInvocation(params);
            await invocation.execute();
            expect(mockHookSystem.fireSubagentStartEvent).toHaveBeenCalledWith(expect.stringContaining('file-search-'), 'file-search', PermissionMode.Default, undefined);
        });
        it('should inject additionalContext from SubagentStart hook into context', async () => {
            const mockStartOutput = {
                getAdditionalContext: vi
                    .fn()
                    .mockReturnValue('Extra context from hook'),
            };
            vi.mocked(mockHookSystem.fireSubagentStartEvent).mockResolvedValue(mockStartOutput);
            const params = {
                description: 'Search files',
                prompt: 'Find all TypeScript files',
                subagent_type: 'file-search',
            };
            const invocation = agentTool.createInvocation(params);
            await invocation.execute();
            expect(mockContextState.set).toHaveBeenCalledWith('hook_context', 'Extra context from hook');
        });
        it('should not inject hook_context when additionalContext is undefined', async () => {
            const mockStartOutput = {
                getAdditionalContext: vi.fn().mockReturnValue(undefined),
            };
            vi.mocked(mockHookSystem.fireSubagentStartEvent).mockResolvedValue(mockStartOutput);
            const params = {
                description: 'Search files',
                prompt: 'Find all TypeScript files',
                subagent_type: 'file-search',
            };
            const invocation = agentTool.createInvocation(params);
            await invocation.execute();
            expect(mockContextState.set).not.toHaveBeenCalledWith('hook_context', expect.anything());
        });
        it('should continue execution when SubagentStart hook fails', async () => {
            vi.mocked(mockHookSystem.fireSubagentStartEvent).mockRejectedValue(new Error('Hook failed'));
            const params = {
                description: 'Search files',
                prompt: 'Find all TypeScript files',
                subagent_type: 'file-search',
            };
            const invocation = agentTool.createInvocation(params);
            const result = await invocation.execute();
            // Should still complete successfully despite hook failure
            const llmText = partToString(result.llmContent);
            expect(llmText).toBe('Task completed successfully');
            const display = result.returnDisplay;
            expect(display.status).toBe('completed');
        });
        it('should skip hooks when hookSystem is not available', async () => {
            config['getHookSystem'] = vi
                .fn()
                .mockReturnValue(undefined);
            const params = {
                description: 'Search files',
                prompt: 'Find all TypeScript files',
                subagent_type: 'file-search',
            };
            const invocation = agentTool.createInvocation(params);
            const result = await invocation.execute();
            expect(mockHookSystem.fireSubagentStartEvent).not.toHaveBeenCalled();
            const llmText = partToString(result.llmContent);
            expect(llmText).toBe('Task completed successfully');
        });
    });
    describe('SubagentStop hook integration', () => {
        let mockAgent;
        let mockContextState;
        let mockHookSystem;
        beforeEach(() => {
            mockAgent = {
                execute: vi.fn().mockResolvedValue(undefined),
                result: 'Task completed successfully',
                terminateMode: AgentTerminateMode.GOAL,
                getFinalText: vi.fn().mockReturnValue('Task completed successfully'),
                formatCompactResult: vi.fn().mockReturnValue('✅ Success'),
                getExecutionSummary: vi.fn().mockReturnValue({
                    rounds: 1,
                    totalDurationMs: 500,
                    totalToolCalls: 1,
                    successfulToolCalls: 1,
                    failedToolCalls: 0,
                    successRate: 100,
                    inputTokens: 100,
                    outputTokens: 50,
                    totalTokens: 150,
                    estimatedCost: 0.01,
                    toolUsage: [],
                }),
                getStatistics: vi.fn().mockReturnValue({
                    rounds: 1,
                    totalDurationMs: 500,
                    totalToolCalls: 1,
                    successfulToolCalls: 1,
                    failedToolCalls: 0,
                }),
                getTerminateMode: vi.fn().mockReturnValue(AgentTerminateMode.GOAL),
            };
            mockContextState = {
                set: vi.fn(),
            };
            MockedContextState.mockImplementation(() => mockContextState);
            vi.mocked(mockSubagentManager.loadSubagent).mockResolvedValue(mockSubagents[0]);
            vi.mocked(mockSubagentManager.createAgentHeadless).mockResolvedValue(mockAgent);
            mockHookSystem = {
                fireSubagentStartEvent: vi.fn().mockResolvedValue(undefined),
                fireSubagentStopEvent: vi.fn().mockResolvedValue(undefined),
            };
            vi.mocked(config.getGeminiClient).mockReturnValue(undefined);
            config['getHookSystem'] = vi
                .fn()
                .mockReturnValue(mockHookSystem);
            config['getTranscriptPath'] = vi
                .fn()
                .mockReturnValue('/test/transcript');
        });
        it('should call fireSubagentStopEvent after execution', async () => {
            const params = {
                description: 'Search files',
                prompt: 'Find all TypeScript files',
                subagent_type: 'file-search',
            };
            const invocation = agentTool.createInvocation(params);
            await invocation.execute();
            expect(mockHookSystem.fireSubagentStopEvent).toHaveBeenCalledWith(expect.stringContaining('file-search-'), 'file-search', '/test/transcript', 'Task completed successfully', false, PermissionMode.Default, undefined);
        });
        it('should re-execute subagent when stop hook returns blocking decision', async () => {
            const mockBlockOutput = {
                isBlockingDecision: vi
                    .fn()
                    .mockReturnValueOnce(true)
                    .mockReturnValueOnce(false),
                shouldStopExecution: vi.fn().mockReturnValue(false),
                getEffectiveReason: vi
                    .fn()
                    .mockReturnValue('Continue working on the task'),
            };
            // First call returns block, second call returns allow (no output)
            vi.mocked(mockHookSystem.fireSubagentStopEvent)
                .mockResolvedValueOnce(mockBlockOutput)
                .mockResolvedValueOnce(undefined);
            const params = {
                description: 'Search files',
                prompt: 'Find all TypeScript files',
                subagent_type: 'file-search',
            };
            const invocation = agentTool.createInvocation(params);
            await invocation.execute();
            // Should have called execute twice (initial + re-execution)
            expect(mockAgent.execute).toHaveBeenCalledTimes(2);
            // Stop hook should have been called twice
            expect(mockHookSystem.fireSubagentStopEvent).toHaveBeenCalledTimes(2);
            // Second call should have stopHookActive=true
            expect(mockHookSystem.fireSubagentStopEvent).toHaveBeenNthCalledWith(2, expect.stringContaining('file-search-'), 'file-search', '/test/transcript', 'Task completed successfully', true, PermissionMode.Default, undefined);
        });
        it('should re-execute subagent when stop hook returns shouldStopExecution', async () => {
            const mockStopOutput = {
                isBlockingDecision: vi.fn().mockReturnValue(false),
                shouldStopExecution: vi.fn().mockReturnValueOnce(true),
                getEffectiveReason: vi.fn().mockReturnValue('Output is incomplete'),
            };
            vi.mocked(mockHookSystem.fireSubagentStopEvent)
                .mockResolvedValueOnce(mockStopOutput)
                .mockResolvedValueOnce(undefined);
            const params = {
                description: 'Search files',
                prompt: 'Find all TypeScript files',
                subagent_type: 'file-search',
            };
            const invocation = agentTool.createInvocation(params);
            await invocation.execute();
            expect(mockAgent.execute).toHaveBeenCalledTimes(2);
        });
        it('should allow stop when SubagentStop hook fails', async () => {
            vi.mocked(mockHookSystem.fireSubagentStopEvent).mockRejectedValue(new Error('Stop hook failed'));
            const params = {
                description: 'Search files',
                prompt: 'Find all TypeScript files',
                subagent_type: 'file-search',
            };
            const invocation = agentTool.createInvocation(params);
            const result = await invocation.execute();
            // Should still complete successfully despite hook failure
            const llmText = partToString(result.llmContent);
            expect(llmText).toBe('Task completed successfully');
            const display = result.returnDisplay;
            expect(display.status).toBe('completed');
        });
        it('should skip SubagentStop hook when signal is aborted', async () => {
            const abortController = new AbortController();
            abortController.abort();
            const params = {
                description: 'Search files',
                prompt: 'Find all TypeScript files',
                subagent_type: 'file-search',
            };
            const invocation = agentTool.createInvocation(params);
            await invocation.execute(abortController.signal);
            expect(mockHookSystem.fireSubagentStopEvent).not.toHaveBeenCalled();
        });
        it('should stop re-execution loop when signal is aborted during block handling', async () => {
            const abortController = new AbortController();
            const mockBlockOutput = {
                isBlockingDecision: vi.fn().mockReturnValue(true),
                shouldStopExecution: vi.fn().mockReturnValue(false),
                getEffectiveReason: vi.fn().mockReturnValue('Keep working'),
            };
            vi.mocked(mockHookSystem.fireSubagentStopEvent).mockResolvedValue(mockBlockOutput);
            // Abort after first re-execution
            vi.mocked(mockAgent.execute).mockImplementation(async () => {
                const callCount = vi.mocked(mockAgent.execute).mock.calls.length;
                if (callCount >= 2) {
                    abortController.abort();
                }
            });
            const params = {
                description: 'Search files',
                prompt: 'Find all TypeScript files',
                subagent_type: 'file-search',
            };
            const invocation = agentTool.createInvocation(params);
            await invocation.execute(abortController.signal);
            // Should have stopped the loop after abort
            expect(mockAgent.execute).toHaveBeenCalledTimes(2);
        });
        it('should call both start and stop hooks in correct order', async () => {
            const callOrder = [];
            vi.mocked(mockHookSystem.fireSubagentStartEvent).mockImplementation(async () => {
                callOrder.push('start');
                return undefined;
            });
            vi.mocked(mockHookSystem.fireSubagentStopEvent).mockImplementation(async () => {
                callOrder.push('stop');
                return undefined;
            });
            const params = {
                description: 'Search files',
                prompt: 'Find all TypeScript files',
                subagent_type: 'file-search',
            };
            const invocation = agentTool.createInvocation(params);
            await invocation.execute();
            expect(callOrder).toEqual(['start', 'stop']);
        });
        it('should pass consistent agentId to both start and stop hooks', async () => {
            const params = {
                description: 'Search files',
                prompt: 'Find all TypeScript files',
                subagent_type: 'file-search',
            };
            const invocation = agentTool.createInvocation(params);
            await invocation.execute();
            const startAgentId = vi.mocked(mockHookSystem.fireSubagentStartEvent).mock
                .calls[0]?.[0];
            const stopAgentId = vi.mocked(mockHookSystem.fireSubagentStopEvent).mock
                .calls[0]?.[0];
            expect(startAgentId).toBe(stopAgentId);
            expect(startAgentId).toMatch(/^file-search-\d+$/);
        });
    });
    describe('IDE diff-tab confirmation clears pendingConfirmation', () => {
        let mockAgent;
        let mockContextState;
        // We capture the eventEmitter from the invocation so we can simulate
        // events during subagent execution.
        let capturedInvocation;
        beforeEach(() => {
            mockContextState = {
                set: vi.fn(),
            };
            MockedContextState.mockImplementation(() => mockContextState);
            vi.mocked(mockSubagentManager.loadSubagent).mockResolvedValue(mockSubagents[0]);
        });
        function createInvocationWithEventDrivenAgent(emitDuringExecute) {
            // Create a mock agent whose execute() emits events on the invocation's
            // eventEmitter, simulating a real subagent lifecycle.
            mockAgent = {
                execute: vi.fn(),
                result: 'Done',
                terminateMode: AgentTerminateMode.GOAL,
                getFinalText: vi.fn().mockReturnValue('Done'),
                formatCompactResult: vi.fn().mockReturnValue('✅ Success'),
                getExecutionSummary: vi.fn().mockReturnValue({
                    rounds: 1,
                    totalDurationMs: 100,
                    totalToolCalls: 1,
                    successfulToolCalls: 1,
                    failedToolCalls: 0,
                    successRate: 100,
                    inputTokens: 10,
                    outputTokens: 5,
                    totalTokens: 15,
                    toolUsage: [],
                }),
                getStatistics: vi.fn().mockReturnValue({
                    rounds: 1,
                    totalDurationMs: 100,
                    totalToolCalls: 1,
                    successfulToolCalls: 1,
                    failedToolCalls: 0,
                }),
                getTerminateMode: vi.fn().mockReturnValue(AgentTerminateMode.GOAL),
            };
            vi.mocked(mockAgent.execute).mockImplementation(async () => {
                emitDuringExecute(capturedInvocation.eventEmitter);
            });
            vi.mocked(mockSubagentManager.createAgentHeadless).mockResolvedValue(mockAgent);
            const params = {
                description: 'Edit files',
                prompt: 'Fix the bug',
                subagent_type: 'file-search',
            };
            capturedInvocation = agentTool.createInvocation(params);
            return capturedInvocation;
        }
        it('should clear pendingConfirmation when TOOL_RESULT arrives for the pending tool (IDE accept path)', async () => {
            // Track whether pendingConfirmation was set then cleared, using
            // snapshots that safely handle function properties (structuredClone
            // can't serialize functions).
            const snapshots = [];
            const invocation = createInvocationWithEventDrivenAgent((emitter) => {
                emitter.emit(AgentEventType.TOOL_CALL, {
                    subagentId: 'sub-1',
                    round: 1,
                    callId: 'call-edit-1',
                    name: 'edit_file',
                    args: { path: '/test.ts' },
                    description: 'Editing test.ts',
                    timestamp: Date.now(),
                });
                // Tool needs approval → pendingConfirmation is set
                emitter.emit(AgentEventType.TOOL_WAITING_APPROVAL, {
                    subagentId: 'sub-1',
                    round: 1,
                    callId: 'call-edit-1',
                    name: 'edit_file',
                    description: 'Editing test.ts',
                    timestamp: Date.now(),
                    confirmationDetails: {
                        type: 'edit',
                        title: 'Edit file',
                        fileName: 'test.ts',
                        filePath: '/test.ts',
                        fileDiff: '',
                        originalContent: 'old',
                        newContent: 'new',
                    },
                    respond: vi.fn(),
                });
                // IDE diff-tab accepted → TOOL_RESULT arrives without onConfirm
                emitter.emit(AgentEventType.TOOL_RESULT, {
                    subagentId: 'sub-1',
                    round: 1,
                    callId: 'call-edit-1',
                    name: 'edit_file',
                    success: true,
                    timestamp: Date.now(),
                });
            });
            await invocation.execute(undefined, (output) => {
                const display = output;
                snapshots.push({
                    hasPendingConfirmation: display.pendingConfirmation !== undefined,
                    toolStatuses: (display.toolCalls ?? []).map((tc) => ({
                        callId: tc.callId,
                        status: tc.status,
                    })),
                });
            });
            // Should have at least one snapshot with pendingConfirmation set
            const hasApproval = snapshots.some((s) => s.hasPendingConfirmation);
            expect(hasApproval).toBe(true);
            // The final snapshot after TOOL_RESULT should have cleared it
            const resultSnapshot = snapshots.find((s) => !s.hasPendingConfirmation &&
                s.toolStatuses.some((tc) => tc.callId === 'call-edit-1' && tc.status === 'success'));
            expect(resultSnapshot).toBeDefined();
        });
        it('should NOT clear pendingConfirmation when TOOL_RESULT is for a different tool', async () => {
            const snapshots = [];
            const invocation = createInvocationWithEventDrivenAgent((emitter) => {
                // Tool A starts
                emitter.emit(AgentEventType.TOOL_CALL, {
                    subagentId: 'sub-1',
                    round: 1,
                    callId: 'call-read-1',
                    name: 'read_file',
                    args: {},
                    description: 'Reading',
                    timestamp: Date.now(),
                });
                // Tool B starts
                emitter.emit(AgentEventType.TOOL_CALL, {
                    subagentId: 'sub-1',
                    round: 1,
                    callId: 'call-edit-1',
                    name: 'edit_file',
                    args: {},
                    description: 'Editing',
                    timestamp: Date.now(),
                });
                // Tool B needs approval
                emitter.emit(AgentEventType.TOOL_WAITING_APPROVAL, {
                    subagentId: 'sub-1',
                    round: 1,
                    callId: 'call-edit-1',
                    name: 'edit_file',
                    description: 'Editing',
                    timestamp: Date.now(),
                    confirmationDetails: {
                        type: 'edit',
                        title: 'Edit',
                        fileName: 'test.ts',
                        filePath: '/test.ts',
                        fileDiff: '',
                        originalContent: '',
                        newContent: 'new',
                    },
                    respond: vi.fn(),
                });
                // Tool A finishes (different callId)
                emitter.emit(AgentEventType.TOOL_RESULT, {
                    subagentId: 'sub-1',
                    round: 1,
                    callId: 'call-read-1',
                    name: 'read_file',
                    success: true,
                    timestamp: Date.now(),
                });
            });
            await invocation.execute(undefined, (output) => {
                const display = output;
                snapshots.push({
                    hasPendingConfirmation: display.pendingConfirmation !== undefined,
                    toolStatuses: (display.toolCalls ?? []).map((tc) => ({
                        callId: tc.callId,
                        status: tc.status,
                    })),
                });
            });
            // The snapshot for read_file's TOOL_RESULT should still have
            // pendingConfirmation because the result was for a different tool.
            const readResultSnapshot = snapshots.find((s) => s.toolStatuses.some((tc) => tc.callId === 'call-read-1' && tc.status === 'success'));
            expect(readResultSnapshot).toBeDefined();
            expect(readResultSnapshot.hasPendingConfirmation).toBe(true);
        });
        it('should clear pendingConfirmation via onConfirm callback (terminal UI path)', async () => {
            let capturedOnConfirm;
            const snapshots = [];
            const invocation = createInvocationWithEventDrivenAgent((emitter) => {
                emitter.emit(AgentEventType.TOOL_CALL, {
                    subagentId: 'sub-1',
                    round: 1,
                    callId: 'call-edit-1',
                    name: 'edit_file',
                    args: {},
                    description: 'Editing',
                    timestamp: Date.now(),
                });
                emitter.emit(AgentEventType.TOOL_WAITING_APPROVAL, {
                    subagentId: 'sub-1',
                    round: 1,
                    callId: 'call-edit-1',
                    name: 'edit_file',
                    description: 'Editing',
                    timestamp: Date.now(),
                    confirmationDetails: {
                        type: 'edit',
                        title: 'Edit',
                        fileName: 'test.ts',
                        filePath: '/test.ts',
                        fileDiff: '',
                        originalContent: '',
                        newContent: 'new',
                    },
                    respond: vi.fn(),
                });
            });
            await invocation.execute(undefined, (output) => {
                const display = output;
                snapshots.push({
                    hasPendingConfirmation: display.pendingConfirmation !== undefined,
                });
                if (display.pendingConfirmation?.onConfirm) {
                    capturedOnConfirm = display.pendingConfirmation.onConfirm;
                }
            });
            expect(capturedOnConfirm).toBeDefined();
            // Call onConfirm as if the user pressed "accept" in the terminal UI
            snapshots.length = 0;
            await capturedOnConfirm(ToolConfirmationOutcome.ProceedOnce);
            // The onConfirm callback should have cleared pendingConfirmation
            expect(snapshots.some((s) => !s.hasPendingConfirmation)).toBe(true);
        });
    });
});
//# sourceMappingURL=agent.test.js.map