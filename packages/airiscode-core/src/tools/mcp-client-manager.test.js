/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { McpClientManager } from './mcp-client-manager.js';
import { McpClient } from './mcp-client.js';
vi.mock('./mcp-client.js', async () => {
    const originalModule = await vi.importActual('./mcp-client.js');
    return {
        ...originalModule,
        McpClient: vi.fn(),
        // Return the input servers unchanged (identity function)
        populateMcpServerCommand: vi.fn((servers) => servers),
    };
});
describe('McpClientManager', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });
    it('should discover tools from all servers', async () => {
        const mockedMcpClient = {
            connect: vi.fn(),
            discover: vi.fn(),
            disconnect: vi.fn(),
            getStatus: vi.fn(),
        };
        vi.mocked(McpClient).mockReturnValue(mockedMcpClient);
        const mockConfig = {
            isTrustedFolder: () => true,
            getMcpServers: () => ({ 'test-server': {} }),
            getMcpServerCommand: () => undefined,
            getPromptRegistry: () => ({}),
            getWorkspaceContext: () => ({}),
            getDebugMode: () => false,
            isMcpServerDisabled: () => false,
        };
        const manager = new McpClientManager(mockConfig, {});
        await manager.discoverAllMcpTools(mockConfig);
        expect(mockedMcpClient.connect).toHaveBeenCalledOnce();
        expect(mockedMcpClient.discover).toHaveBeenCalledOnce();
    });
    it('should not discover tools if folder is not trusted', async () => {
        const mockedMcpClient = {
            connect: vi.fn(),
            discover: vi.fn(),
            disconnect: vi.fn(),
            getStatus: vi.fn(),
        };
        vi.mocked(McpClient).mockReturnValue(mockedMcpClient);
        const mockConfig = {
            isTrustedFolder: () => false,
            getMcpServers: () => ({ 'test-server': {} }),
            getMcpServerCommand: () => undefined,
            getPromptRegistry: () => ({}),
            getWorkspaceContext: () => ({}),
            getDebugMode: () => false,
            isMcpServerDisabled: () => false,
        };
        const manager = new McpClientManager(mockConfig, {});
        await manager.discoverAllMcpTools(mockConfig);
        expect(mockedMcpClient.connect).not.toHaveBeenCalled();
        expect(mockedMcpClient.discover).not.toHaveBeenCalled();
    });
    it('should disconnect all clients when stop is called', async () => {
        // Track disconnect calls across all instances
        const disconnectCalls = [];
        vi.mocked(McpClient).mockImplementation((name) => ({
            connect: vi.fn(),
            discover: vi.fn(),
            disconnect: vi.fn().mockImplementation(() => {
                disconnectCalls.push(name);
                return Promise.resolve();
            }),
            getStatus: vi.fn(),
        }));
        const mockConfig = {
            isTrustedFolder: () => true,
            getMcpServers: () => ({ 'test-server': {}, 'another-server': {} }),
            getMcpServerCommand: () => undefined,
            getPromptRegistry: () => ({}),
            getWorkspaceContext: () => ({}),
            getDebugMode: () => false,
            isMcpServerDisabled: () => false,
        };
        const manager = new McpClientManager(mockConfig, {});
        // First connect to create the clients
        await manager.discoverAllMcpTools({
            isTrustedFolder: () => true,
            isMcpServerDisabled: () => false,
        });
        // Clear the disconnect calls from initial stop() in discoverAllMcpTools
        disconnectCalls.length = 0;
        // Then stop
        await manager.stop();
        expect(disconnectCalls).toHaveLength(2);
        expect(disconnectCalls).toContain('test-server');
        expect(disconnectCalls).toContain('another-server');
    });
    it('should be idempotent - stop can be called multiple times safely', async () => {
        const mockedMcpClient = {
            connect: vi.fn(),
            discover: vi.fn(),
            disconnect: vi.fn().mockResolvedValue(undefined),
            getStatus: vi.fn(),
        };
        vi.mocked(McpClient).mockReturnValue(mockedMcpClient);
        const mockConfig = {
            isTrustedFolder: () => true,
            getMcpServers: () => ({ 'test-server': {} }),
            getMcpServerCommand: () => undefined,
            getPromptRegistry: () => ({}),
            getWorkspaceContext: () => ({}),
            getDebugMode: () => false,
            isMcpServerDisabled: () => false,
        };
        const manager = new McpClientManager(mockConfig, {});
        await manager.discoverAllMcpTools({
            isTrustedFolder: () => true,
            isMcpServerDisabled: () => false,
        });
        // Call stop multiple times - should not throw
        await manager.stop();
        await manager.stop();
        await manager.stop();
    });
    it('should discover tools for a single server and track the client for stop', async () => {
        const mockedMcpClient = {
            connect: vi.fn(),
            discover: vi.fn(),
            disconnect: vi.fn().mockResolvedValue(undefined),
            getStatus: vi.fn(),
        };
        vi.mocked(McpClient).mockReturnValue(mockedMcpClient);
        const mockConfig = {
            isTrustedFolder: () => true,
            getMcpServers: () => ({ 'test-server': {} }),
            getMcpServerCommand: () => undefined,
            getPromptRegistry: () => ({}),
            getWorkspaceContext: () => ({}),
            getDebugMode: () => false,
        };
        const manager = new McpClientManager(mockConfig, {});
        await manager.discoverMcpToolsForServer('test-server', {});
        expect(mockedMcpClient.connect).toHaveBeenCalledOnce();
        expect(mockedMcpClient.discover).toHaveBeenCalledOnce();
        await manager.stop();
        expect(mockedMcpClient.disconnect).toHaveBeenCalledOnce();
    });
    it('should replace an existing client when re-discovering a server', async () => {
        const firstClient = {
            connect: vi.fn(),
            discover: vi.fn(),
            disconnect: vi.fn().mockResolvedValue(undefined),
            getStatus: vi.fn(),
        };
        const secondClient = {
            connect: vi.fn(),
            discover: vi.fn(),
            disconnect: vi.fn().mockResolvedValue(undefined),
            getStatus: vi.fn(),
        };
        vi.mocked(McpClient)
            .mockReturnValueOnce(firstClient)
            .mockReturnValueOnce(secondClient);
        const mockConfig = {
            isTrustedFolder: () => true,
            getMcpServers: () => ({ 'test-server': {} }),
            getMcpServerCommand: () => undefined,
            getPromptRegistry: () => ({}),
            getWorkspaceContext: () => ({}),
            getDebugMode: () => false,
        };
        const manager = new McpClientManager(mockConfig, {});
        await manager.discoverMcpToolsForServer('test-server', {});
        await manager.discoverMcpToolsForServer('test-server', {});
        expect(firstClient.disconnect).toHaveBeenCalledOnce();
        expect(secondClient.connect).toHaveBeenCalledOnce();
        expect(secondClient.discover).toHaveBeenCalledOnce();
        await manager.stop();
        expect(secondClient.disconnect).toHaveBeenCalledOnce();
    });
    it('should no-op when discovering an unknown server', async () => {
        const mockedMcpClient = {
            connect: vi.fn(),
            discover: vi.fn(),
            disconnect: vi.fn().mockResolvedValue(undefined),
            getStatus: vi.fn(),
        };
        vi.mocked(McpClient).mockReturnValue(mockedMcpClient);
        const mockConfig = {
            isTrustedFolder: () => true,
            getMcpServers: () => ({}),
            getMcpServerCommand: () => undefined,
            getPromptRegistry: () => ({}),
            getWorkspaceContext: () => ({}),
            getDebugMode: () => false,
        };
        const manager = new McpClientManager(mockConfig, {});
        await manager.discoverMcpToolsForServer('unknown-server', {
            isTrustedFolder: () => true,
        });
        expect(vi.mocked(McpClient)).not.toHaveBeenCalled();
    });
});
//# sourceMappingURL=mcp-client-manager.test.js.map