/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SkillTool } from './skill.js';
import { SkillManager } from '../skills/skill-manager.js';
import { partToString } from '../utils/partUtils.js';
// Mock dependencies
vi.mock('../skills/skill-manager.js');
vi.mock('../telemetry/index.js', () => ({
    logSkillLaunch: vi.fn(),
    SkillLaunchEvent: class {
        skill_name;
        success;
        constructor(skill_name, success) {
            this.skill_name = skill_name;
            this.success = success;
        }
    },
}));
const MockedSkillManager = vi.mocked(SkillManager);
describe('SkillTool', () => {
    let config;
    let skillTool;
    let mockSkillManager;
    let changeListeners;
    const mockSkills = [
        {
            name: 'code-review',
            description: 'Specialized skill for reviewing code quality',
            level: 'project',
            filePath: '/project/.airiscode/skills/code-review/SKILL.md',
            body: 'Review code for quality and best practices.',
        },
        {
            name: 'testing',
            description: 'Skill for writing and running tests',
            level: 'user',
            filePath: '/home/user/.airiscode/skills/testing/SKILL.md',
            body: 'Help write comprehensive tests.',
            allowedTools: ['read_file', 'write_file', 'shell'],
        },
    ];
    beforeEach(async () => {
        // Setup fake timers
        vi.useFakeTimers();
        // Create mock config
        config = {
            getProjectRoot: vi.fn().mockReturnValue('/test/project'),
            getSessionId: vi.fn().mockReturnValue('test-session-id'),
            getSkillManager: vi.fn(),
            getGeminiClient: vi.fn().mockReturnValue(undefined),
        };
        changeListeners = [];
        // Setup SkillManager mock
        mockSkillManager = {
            listSkills: vi.fn().mockResolvedValue(mockSkills),
            loadSkill: vi.fn(),
            loadSkillForRuntime: vi.fn(),
            addChangeListener: vi.fn((listener) => {
                changeListeners.push(listener);
                return () => {
                    const index = changeListeners.indexOf(listener);
                    if (index >= 0) {
                        changeListeners.splice(index, 1);
                    }
                };
            }),
            getParseErrors: vi.fn().mockReturnValue(new Map()),
        };
        MockedSkillManager.mockImplementation(() => mockSkillManager);
        // Make config return the mock SkillManager
        vi.mocked(config.getSkillManager).mockReturnValue(mockSkillManager);
        // Create SkillTool instance
        skillTool = new SkillTool(config);
        // Allow async initialization to complete
        await vi.runAllTimersAsync();
    });
    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });
    describe('initialization', () => {
        it('should initialize with correct name and properties', () => {
            expect(skillTool.name).toBe('skill');
            expect(skillTool.displayName).toBe('Skill');
            expect(skillTool.kind).toBe('read');
        });
        it('should load available skills during initialization', () => {
            expect(mockSkillManager.listSkills).toHaveBeenCalled();
        });
        it('should subscribe to skill manager changes', () => {
            expect(mockSkillManager.addChangeListener).toHaveBeenCalledTimes(1);
        });
        it('should update description with available skills', () => {
            expect(skillTool.description).toContain('code-review');
            expect(skillTool.description).toContain('Specialized skill for reviewing code quality');
            expect(skillTool.description).toContain('testing');
            expect(skillTool.description).toContain('Skill for writing and running tests');
        });
        it('should handle empty skills list gracefully', async () => {
            vi.mocked(mockSkillManager.listSkills).mockResolvedValue([]);
            const emptySkillTool = new SkillTool(config);
            await vi.runAllTimersAsync();
            expect(emptySkillTool.description).toContain('No skills are currently configured');
        });
        it('should handle skill loading errors gracefully', async () => {
            vi.mocked(mockSkillManager.listSkills).mockRejectedValue(new Error('Loading failed'));
            const failedSkillTool = new SkillTool(config);
            await vi.runAllTimersAsync();
            expect(failedSkillTool.description).toContain('No skills are currently configured');
        });
    });
    describe('schema generation', () => {
        it('should expose static schema without dynamic enums', () => {
            const schema = skillTool.schema;
            const properties = schema.parametersJsonSchema;
            expect(properties.properties.skill.type).toBe('string');
            expect(properties.properties.skill.description).toBe('The skill name (no arguments). E.g., "pdf" or "xlsx"');
            expect(properties.properties.skill.enum).toBeUndefined();
        });
        it('should keep schema static even when no skills available', async () => {
            vi.mocked(mockSkillManager.listSkills).mockResolvedValue([]);
            const emptySkillTool = new SkillTool(config);
            await vi.runAllTimersAsync();
            const schema = emptySkillTool.schema;
            const properties = schema.parametersJsonSchema;
            expect(properties.properties.skill.type).toBe('string');
            expect(properties.properties.skill.description).toBe('The skill name (no arguments). E.g., "pdf" or "xlsx"');
            expect(properties.properties.skill.enum).toBeUndefined();
        });
    });
    describe('validateToolParams', () => {
        it('should validate valid parameters', () => {
            const result = skillTool.validateToolParams({ skill: 'code-review' });
            expect(result).toBeNull();
        });
        it('should reject empty skill', () => {
            const result = skillTool.validateToolParams({ skill: '' });
            expect(result).toBe('Parameter "skill" must be a non-empty string.');
        });
        it('should reject non-existent skill', () => {
            const result = skillTool.validateToolParams({
                skill: 'non-existent',
            });
            expect(result).toBe('Skill "non-existent" not found. Available skills: code-review, testing');
        });
        it('should show appropriate message when no skills available', async () => {
            vi.mocked(mockSkillManager.listSkills).mockResolvedValue([]);
            const emptySkillTool = new SkillTool(config);
            await vi.runAllTimersAsync();
            const result = emptySkillTool.validateToolParams({
                skill: 'non-existent',
            });
            expect(result).toBe('Skill "non-existent" not found. No skills are currently available.');
        });
    });
    describe('refreshSkills', () => {
        it('should refresh when change listener fires', async () => {
            const newSkills = [
                {
                    name: 'new-skill',
                    description: 'A brand new skill',
                    level: 'project',
                    filePath: '/project/.airiscode/skills/new-skill/SKILL.md',
                    body: 'New skill content.',
                },
            ];
            vi.mocked(mockSkillManager.listSkills).mockResolvedValueOnce(newSkills);
            const listener = changeListeners[0];
            expect(listener).toBeDefined();
            listener?.();
            await vi.runAllTimersAsync();
            expect(skillTool.description).toContain('new-skill');
            expect(skillTool.description).toContain('A brand new skill');
        });
        it('should refresh available skills and update description', async () => {
            const newSkills = [
                {
                    name: 'test-skill',
                    description: 'A test skill',
                    level: 'project',
                    filePath: '/project/.airiscode/skills/test-skill/SKILL.md',
                    body: 'Test content.',
                },
            ];
            vi.mocked(mockSkillManager.listSkills).mockResolvedValue(newSkills);
            await skillTool.refreshSkills();
            expect(skillTool.description).toContain('test-skill');
            expect(skillTool.description).toContain('A test skill');
        });
    });
    describe('SkillToolInvocation', () => {
        const mockRuntimeConfig = {
            ...mockSkills[0],
        };
        beforeEach(() => {
            vi.mocked(mockSkillManager.loadSkillForRuntime).mockResolvedValue(mockRuntimeConfig);
        });
        it('should execute skill load successfully', async () => {
            const params = {
                skill: 'code-review',
            };
            const invocation = skillTool.createInvocation(params);
            const result = await invocation.execute();
            expect(mockSkillManager.loadSkillForRuntime).toHaveBeenCalledWith('code-review');
            const llmText = partToString(result.llmContent);
            expect(llmText).toContain('Base directory for this skill: /project/.airiscode/skills/code-review');
            expect(llmText.trim()).toContain('Review code for quality and best practices.');
            expect(result.returnDisplay).toBe('Specialized skill for reviewing code quality');
        });
        it('should include allowedTools in result when present', async () => {
            const skillWithTools = {
                ...mockSkills[1],
            };
            vi.mocked(mockSkillManager.loadSkillForRuntime).mockResolvedValue(skillWithTools);
            const params = {
                skill: 'testing',
            };
            const invocation = skillTool.createInvocation(params);
            const result = await invocation.execute();
            const llmText = partToString(result.llmContent);
            expect(llmText).toContain('testing');
            // Base description is omitted from llmContent; ensure body is present.
            expect(llmText).toContain('Help write comprehensive tests.');
            expect(result.returnDisplay).toBe('Skill for writing and running tests');
        });
        it('should handle skill not found error', async () => {
            vi.mocked(mockSkillManager.loadSkillForRuntime).mockResolvedValue(null);
            const params = {
                skill: 'non-existent',
            };
            const invocation = skillTool.createInvocation(params);
            const result = await invocation.execute();
            const llmText = partToString(result.llmContent);
            expect(llmText).toContain('Skill "non-existent" not found');
        });
        it('should handle execution errors gracefully', async () => {
            vi.mocked(mockSkillManager.loadSkillForRuntime).mockRejectedValue(new Error('Loading failed'));
            const params = {
                skill: 'code-review',
            };
            const invocation = skillTool.createInvocation(params);
            const result = await invocation.execute();
            const llmText = partToString(result.llmContent);
            expect(llmText).toContain('Failed to load skill');
            expect(llmText).toContain('Loading failed');
        });
        it('should not require confirmation', async () => {
            const params = {
                skill: 'code-review',
            };
            const invocation = skillTool.createInvocation(params);
            const permission = await invocation.getDefaultPermission();
            expect(permission).toBe('allow');
        });
        it('should provide correct description', () => {
            const params = {
                skill: 'code-review',
            };
            const invocation = skillTool.createInvocation(params);
            const description = invocation.getDescription();
            expect(description).toBe('Use skill: "code-review"');
        });
        it('should handle skill without additional files', async () => {
            vi.mocked(mockSkillManager.loadSkillForRuntime).mockResolvedValue(mockSkills[0]);
            const params = {
                skill: 'code-review',
            };
            const invocation = skillTool.createInvocation(params);
            const result = await invocation.execute();
            const llmText = partToString(result.llmContent);
            expect(llmText).not.toContain('## Additional Files');
            expect(result.returnDisplay).toBe('Specialized skill for reviewing code quality');
        });
    });
});
//# sourceMappingURL=skill.test.js.map