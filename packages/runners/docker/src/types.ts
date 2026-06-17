/**
 * Docker runner types
 */

import type { Result } from "@airiscode/types";

/**
 * Docker operation types
 */
export enum DockerOperation {
  COMPOSE_UP = "compose_up",
  COMPOSE_DOWN = "compose_down",
  COMPOSE_LOGS = "compose_logs",
  CONTAINER_LIST = "container_list",
  CONTAINER_INSPECT = "container_inspect",
  CONTAINER_LOGS = "container_logs",
  CONTAINER_STATS = "container_stats",
  HEALTH_CHECK = "health_check",
  IMAGE_LIST = "image_list",
  IMAGE_PULL = "image_pull",
  NETWORK_LIST = "network_list",
  VOLUME_LIST = "volume_list",
}

/**
 * Docker Compose up options
 */
export interface ComposeUpOptions {
  /** Compose file path */
  file?: string;
  /** Project name */
  projectName?: string;
  /** Build images before starting */
  build?: boolean;
  /** Detached mode */
  detach?: boolean;
  /** Remove orphan containers */
  removeOrphans?: boolean;
  /** Force recreate containers */
  forceRecreate?: boolean;
}

/**
 * Docker Compose down options
 */
export interface ComposeDownOptions {
  /** Compose file path */
  file?: string;
  /** Project name */
  projectName?: string;
  /** Remove volumes */
  volumes?: boolean;
  /** Remove images */
  removeImages?: "all" | "local";
}

/**
 * Container info
 */
export interface ContainerInfo {
  /** Container ID */
  id: string;
  /** Container name */
  name: string;
  /** Image */
  image: string;
  /** State */
  state: "created" | "running" | "paused" | "restarting" | "removing" | "exited" | "dead";
  /** Status */
  status: string;
  /** Ports */
  ports: Array<{
    privatePort: number;
    publicPort?: number;
    type: "tcp" | "udp";
  }>;
  /** Created timestamp */
  created: Date;
}

/**
 * Container health status
 */
export interface ContainerHealth {
  /** Container ID */
  containerId: string;
  /** Health status */
  status: "starting" | "healthy" | "unhealthy" | "none";
  /** Failing streak */
  failingStreak: number;
  /** Last check */
  lastCheck?: {
    exitCode: number;
    output: string;
    start: Date;
    end: Date;
  };
}

/**
 * Container stats
 */
export interface ContainerStats {
  /** Container ID */
  containerId: string;
  /** CPU usage percentage */
  cpuPercent: number;
  /** Memory usage */
  memoryUsage: {
    usage: number;
    limit: number;
    percent: number;
  };
  /** Network I/O */
  network: {
    rx: number;
    tx: number;
  };
  /** Block I/O */
  blockIO: {
    read: number;
    write: number;
  };
  /** PIDs */
  pids: number;
}

/**
 * Image info
 */
export interface ImageInfo {
  /** Image ID */
  id: string;
  /** Repository tags */
  tags: string[];
  /** Size in bytes */
  size: number;
  /** Created timestamp */
  created: Date;
}

/**
 * Network info
 */
export interface NetworkInfo {
  /** Network ID */
  id: string;
  /** Network name */
  name: string;
  /** Driver */
  driver: string;
  /** Scope */
  scope: string;
}

/**
 * Volume info
 */
export interface VolumeInfo {
  /** Volume name */
  name: string;
  /** Driver */
  driver: string;
  /** Mount point */
  mountpoint: string;
  /** Created timestamp */
  created: Date;
}

/**
 * Container logs options
 */
export interface ContainerLogsOptions {
  /** Follow log output */
  follow?: boolean;
  /** Show timestamps */
  timestamps?: boolean;
  /** Number of lines from end */
  tail?: number;
  /** Show logs since timestamp */
  since?: Date | number;
  /** Show stdout */
  stdout?: boolean;
  /** Show stderr */
  stderr?: boolean;
}

/**
 * Docker runner error
 */
export class DockerRunnerError extends Error {
  constructor(
    message: string,
    public operation: DockerOperation,
    public cause?: Error,
  ) {
    super(message);
    this.name = "DockerRunnerError";
  }
}

/**
 * Docker runner result types
 */
export type ComposeUpResult = Result<void, DockerRunnerError>;
export type ComposeDownResult = Result<void, DockerRunnerError>;
export type ComposeLogsResult = Result<string, DockerRunnerError>;
export type ContainerListResult = Result<ContainerInfo[], DockerRunnerError>;
export type ContainerHealthResult = Result<ContainerHealth, DockerRunnerError>;
export type ContainerStatsResult = Result<ContainerStats, DockerRunnerError>;
export type ContainerLogsResult = Result<string, DockerRunnerError>;
export type ImageListResult = Result<ImageInfo[], DockerRunnerError>;
export type ImagePullResult = Result<void, DockerRunnerError>;
export type NetworkListResult = Result<NetworkInfo[], DockerRunnerError>;
export type VolumeListResult = Result<VolumeInfo[], DockerRunnerError>;
