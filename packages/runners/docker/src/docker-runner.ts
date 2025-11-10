/**
 * Docker runner implementation
 */

import Docker from 'dockerode';
import { ok, err } from '@airiscode/types';
import type {
  ComposeUpOptions,
  ComposeDownOptions,
  ContainerInfo,
  ContainerHealth,
  ContainerStats,
  ContainerLogsOptions,
  ImageInfo,
  NetworkInfo,
  VolumeInfo,
  DockerRunnerError,
  ComposeUpResult,
  ComposeDownResult,
  ComposeLogsResult,
  ContainerListResult,
  ContainerHealthResult,
  ContainerStatsResult,
  ContainerLogsResult,
  ImageListResult,
  ImagePullResult,
  NetworkListResult,
  VolumeListResult,
} from './types.js';
import { DockerRunnerError as DockerError, DockerOperation } from './types.js';
import { spawn } from 'child_process';

/**
 * Docker operations runner
 *
 * Features:
 * - Docker Compose operations (up, down, logs)
 * - Container management and inspection
 * - Health checks and stats
 * - Image and network operations
 * - Volume management
 */
export class DockerRunner {
  private docker: Docker;

  constructor(
    private workingDir: string,
    dockerOptions?: Docker.DockerOptions
  ) {
    this.docker = new Docker(dockerOptions);
  }

  /**
   * Start Docker Compose services
   */
  async composeUp(options: ComposeUpOptions = {}): Promise<ComposeUpResult> {
    try {
      const args = ['compose'];

      if (options.file) {
        args.push('-f', options.file);
      }

      if (options.projectName) {
        args.push('-p', options.projectName);
      }

      args.push('up');

      if (options.build) {
        args.push('--build');
      }

      if (options.detach) {
        args.push('-d');
      }

      if (options.removeOrphans) {
        args.push('--remove-orphans');
      }

      if (options.forceRecreate) {
        args.push('--force-recreate');
      }

      await this.execCommand('docker', args);
      return ok(undefined);
    } catch (error) {
      return err<DockerRunnerError>(
        new DockerError(
          'Failed to start Docker Compose services',
          DockerOperation.COMPOSE_UP,
          error instanceof Error ? error : undefined
        )
      ) as ComposeUpResult;
    }
  }

  /**
   * Stop Docker Compose services
   */
  async composeDown(options: ComposeDownOptions = {}): Promise<ComposeDownResult> {
    try {
      const args = ['compose'];

      if (options.file) {
        args.push('-f', options.file);
      }

      if (options.projectName) {
        args.push('-p', options.projectName);
      }

      args.push('down');

      if (options.volumes) {
        args.push('-v');
      }

      if (options.removeImages) {
        args.push('--rmi', options.removeImages);
      }

      await this.execCommand('docker', args);
      return ok(undefined);
    } catch (error) {
      return err<DockerRunnerError>(
        new DockerError(
          'Failed to stop Docker Compose services',
          DockerOperation.COMPOSE_DOWN,
          error instanceof Error ? error : undefined
        )
      ) as ComposeDownResult;
    }
  }

  /**
   * Get Docker Compose logs
   */
  async composeLogs(
    options: { file?: string; projectName?: string; follow?: boolean } = {}
  ): Promise<ComposeLogsResult> {
    try {
      const args = ['compose'];

      if (options.file) {
        args.push('-f', options.file);
      }

      if (options.projectName) {
        args.push('-p', options.projectName);
      }

      args.push('logs');

      if (options.follow) {
        args.push('-f');
      }

      const output = await this.execCommand('docker', args);
      return ok(output);
    } catch (error) {
      return err<DockerRunnerError>(
        new DockerError(
          'Failed to get Docker Compose logs',
          DockerOperation.COMPOSE_LOGS,
          error instanceof Error ? error : undefined
        )
      ) as ComposeLogsResult;
    }
  }

  /**
   * List containers
   */
  async listContainers(all: boolean = false): Promise<ContainerListResult> {
    try {
      const containers = await this.docker.listContainers({ all });

      const result: ContainerInfo[] = containers.map((container) => ({
        id: container.Id,
        name: container.Names[0]?.replace(/^\//, '') || '',
        image: container.Image,
        state: container.State as ContainerInfo['state'],
        status: container.Status,
        ports: container.Ports.map((port) => ({
          privatePort: port.PrivatePort,
          publicPort: port.PublicPort,
          type: port.Type as 'tcp' | 'udp',
        })),
        created: new Date(container.Created * 1000),
      }));

      return ok(result);
    } catch (error) {
      return err<DockerRunnerError>(
        new DockerError(
          'Failed to list containers',
          DockerOperation.CONTAINER_LIST,
          error instanceof Error ? error : undefined
        )
      ) as ContainerListResult;
    }
  }

  /**
   * Get container health status
   */
  async getContainerHealth(containerId: string): Promise<ContainerHealthResult> {
    try {
      const container = this.docker.getContainer(containerId);
      const info = await container.inspect();

      if (!info.State.Health) {
        return ok({
          containerId,
          status: 'none',
          failingStreak: 0,
        }) as ContainerHealthResult;
      }

      const health = info.State.Health;
      const lastLog = health.Log?.[health.Log.length - 1];

      return ok({
        containerId,
        status: health.Status as ContainerHealth['status'],
        failingStreak: health.FailingStreak || 0,
        lastCheck: lastLog
          ? {
              exitCode: lastLog.ExitCode,
              output: lastLog.Output,
              start: new Date(lastLog.Start),
              end: new Date(lastLog.End),
            }
          : undefined,
      });
    } catch (error) {
      return err<DockerRunnerError>(
        new DockerError(
          'Failed to get container health',
          DockerOperation.HEALTH_CHECK,
          error instanceof Error ? error : undefined
        )
      ) as ContainerHealthResult;
    }
  }

  /**
   * Get container stats
   */
  async getContainerStats(containerId: string): Promise<ContainerStatsResult> {
    try {
      const container = this.docker.getContainer(containerId);
      const stats = await container.stats({ stream: false });

      // Calculate CPU percentage
      const cpuDelta =
        stats.cpu_stats.cpu_usage.total_usage -
        stats.precpu_stats.cpu_usage.total_usage;
      const systemDelta =
        stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
      const cpuPercent =
        systemDelta > 0
          ? (cpuDelta / systemDelta) * stats.cpu_stats.online_cpus * 100
          : 0;

      // Memory stats
      const memoryUsage = stats.memory_stats.usage || 0;
      const memoryLimit = stats.memory_stats.limit || 0;
      const memoryPercent = memoryLimit > 0 ? (memoryUsage / memoryLimit) * 100 : 0;

      // Network stats
      const networks = stats.networks || {};
      let rxBytes = 0;
      let txBytes = 0;
      for (const net of Object.values(networks)) {
        rxBytes += net.rx_bytes || 0;
        txBytes += net.tx_bytes || 0;
      }

      // Block I/O stats
      const ioStats = stats.blkio_stats?.io_service_bytes_recursive || [];
      let readBytes = 0;
      let writeBytes = 0;
      for (const io of ioStats) {
        if (io.op === 'read') readBytes += io.value;
        if (io.op === 'write') writeBytes += io.value;
      }

      const result: ContainerStats = {
        containerId,
        cpuPercent: Number(cpuPercent.toFixed(2)),
        memoryUsage: {
          usage: memoryUsage,
          limit: memoryLimit,
          percent: Number(memoryPercent.toFixed(2)),
        },
        network: {
          rx: rxBytes,
          tx: txBytes,
        },
        blockIO: {
          read: readBytes,
          write: writeBytes,
        },
        pids: stats.pids_stats?.current || 0,
      };

      return ok(result);
    } catch (error) {
      return err<DockerRunnerError>(
        new DockerError(
          'Failed to get container stats',
          DockerOperation.CONTAINER_STATS,
          error instanceof Error ? error : undefined
        )
      ) as ContainerStatsResult;
    }
  }

  /**
   * Get container logs
   */
  async getContainerLogs(
    containerId: string,
    options: ContainerLogsOptions = {}
  ): Promise<ContainerLogsResult> {
    try {
      const container = this.docker.getContainer(containerId);

      const logOptions: Docker.ContainerLogsOptions & { follow?: false } = {
        follow: false,
        stdout: options.stdout !== false,
        stderr: options.stderr !== false,
        timestamps: options.timestamps || false,
        tail: options.tail,
        since: options.since
          ? typeof options.since === 'number'
            ? options.since
            : Math.floor(options.since.getTime() / 1000)
          : undefined,
      };

      const buffer = await container.logs(logOptions);
      const logs = buffer.toString('utf-8');

      return ok(logs);
    } catch (error) {
      return err<DockerRunnerError>(
        new DockerError(
          'Failed to get container logs',
          DockerOperation.CONTAINER_LOGS,
          error instanceof Error ? error : undefined
        )
      ) as ContainerLogsResult;
    }
  }

  /**
   * List images
   */
  async listImages(): Promise<ImageListResult> {
    try {
      const images = await this.docker.listImages();

      const result: ImageInfo[] = images.map((image) => ({
        id: image.Id,
        tags: image.RepoTags || [],
        size: image.Size,
        created: new Date(image.Created * 1000),
      }));

      return ok(result);
    } catch (error) {
      return err<DockerRunnerError>(
        new DockerError(
          'Failed to list images',
          DockerOperation.IMAGE_LIST,
          error instanceof Error ? error : undefined
        )
      ) as ImageListResult;
    }
  }

  /**
   * Pull image
   */
  async pullImage(imageName: string): Promise<ImagePullResult> {
    try {
      await new Promise<void>((resolve, reject) => {
        this.docker.pull(imageName, (err: Error | null, stream: NodeJS.ReadableStream) => {
          if (err) {
            reject(err);
            return;
          }

          this.docker.modem.followProgress(
            stream,
            (err: Error | null) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      });

      return ok(undefined);
    } catch (error) {
      return err<DockerRunnerError>(
        new DockerError(
          'Failed to pull image',
          DockerOperation.IMAGE_PULL,
          error instanceof Error ? error : undefined
        )
      ) as ImagePullResult;
    }
  }

  /**
   * List networks
   */
  async listNetworks(): Promise<NetworkListResult> {
    try {
      const networks = await this.docker.listNetworks();

      const result: NetworkInfo[] = networks.map((network) => ({
        id: network.Id,
        name: network.Name,
        driver: network.Driver,
        scope: network.Scope,
      }));

      return ok(result);
    } catch (error) {
      return err<DockerRunnerError>(
        new DockerError(
          'Failed to list networks',
          DockerOperation.NETWORK_LIST,
          error instanceof Error ? error : undefined
        )
      ) as NetworkListResult;
    }
  }

  /**
   * List volumes
   */
  async listVolumes(): Promise<VolumeListResult> {
    try {
      const response = await this.docker.listVolumes();
      const volumes = response.Volumes || [];

      const result: VolumeInfo[] = volumes.map((volume) => ({
        name: volume.Name,
        driver: volume.Driver,
        mountpoint: volume.Mountpoint,
        created: (volume as any).CreatedAt ? new Date((volume as any).CreatedAt) : new Date(),
      }));

      return ok(result);
    } catch (error) {
      return err<DockerRunnerError>(
        new DockerError(
          'Failed to list volumes',
          DockerOperation.VOLUME_LIST,
          error instanceof Error ? error : undefined
        )
      ) as VolumeListResult;
    }
  }

  /**
   * Execute shell command
   */
  private execCommand(command: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, {
        cwd: this.workingDir,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });

      proc.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });

      proc.on('error', (error) => {
        reject(error);
      });
    });
  }
}
