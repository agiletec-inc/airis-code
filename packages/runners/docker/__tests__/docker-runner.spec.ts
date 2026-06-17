import { beforeEach, describe, expect, it, vi } from "vitest";
import { DockerRunner } from "../src/docker-runner.js";
import { DockerOperation } from "../src/types.js";

// Mock dockerode
vi.mock("dockerode", () => ({
  default: vi.fn(() => ({
    listContainers: vi.fn(),
    getContainer: vi.fn(),
    listImages: vi.fn(),
    pull: vi.fn(),
    listNetworks: vi.fn(),
    listVolumes: vi.fn(),
    modem: {
      followProgress: vi.fn(),
    },
  })),
}));

// Mock child_process
vi.mock("child_process", () => ({
  spawn: vi.fn(),
}));

describe("@airiscode/runners-docker - DockerRunner", () => {
  let runner: DockerRunner;
  let mockDocker: any;

  beforeEach(async () => {
    const Docker = (await import("dockerode")).default;
    mockDocker = new Docker();
    runner = new DockerRunner("/test/project");
  });

  describe("listContainers", () => {
    it("should list running containers", async () => {
      mockDocker.listContainers.mockResolvedValueOnce([
        {
          Id: "container1",
          Names: ["/app-web"],
          Image: "nginx:latest",
          State: "running",
          Status: "Up 2 hours",
          Ports: [{ PrivatePort: 80, PublicPort: 8080, Type: "tcp" }],
          Created: 1704067200,
        },
        {
          Id: "container2",
          Names: ["/app-db"],
          Image: "postgres:15",
          State: "running",
          Status: "Up 2 hours",
          Ports: [{ PrivatePort: 5432, Type: "tcp" }],
          Created: 1704067200,
        },
      ]);

      const result = await runner.listContainers();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0].name).toBe("app-web");
        expect(result.value[0].state).toBe("running");
        expect(result.value[0].ports).toHaveLength(1);
        expect(result.value[0].ports[0].publicPort).toBe(8080);
      }
    });

    it("should list all containers including stopped", async () => {
      mockDocker.listContainers.mockResolvedValueOnce([
        {
          Id: "container1",
          Names: ["/app-web"],
          Image: "nginx:latest",
          State: "exited",
          Status: "Exited (0) 1 hour ago",
          Ports: [],
          Created: 1704067200,
        },
      ]);

      const result = await runner.listContainers(true);

      expect(result.ok).toBe(true);
      expect(mockDocker.listContainers).toHaveBeenCalledWith({ all: true });
    });

    it("should handle errors", async () => {
      mockDocker.listContainers.mockRejectedValueOnce(new Error("Docker daemon not running"));

      const result = await runner.listContainers();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.operation).toBe(DockerOperation.CONTAINER_LIST);
      }
    });
  });

  describe("getContainerHealth", () => {
    it("should get healthy container status", async () => {
      const mockContainer = {
        inspect: vi.fn().mockResolvedValue({
          State: {
            Health: {
              Status: "healthy",
              FailingStreak: 0,
              Log: [
                {
                  ExitCode: 0,
                  Output: "Health check passed",
                  Start: "2024-01-01T00:00:00Z",
                  End: "2024-01-01T00:00:01Z",
                },
              ],
            },
          },
        }),
      };

      mockDocker.getContainer.mockReturnValueOnce(mockContainer);

      const result = await runner.getContainerHealth("container1");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe("healthy");
        expect(result.value.failingStreak).toBe(0);
        expect(result.value.lastCheck).toBeDefined();
        expect(result.value.lastCheck?.exitCode).toBe(0);
      }
    });

    it("should handle unhealthy container", async () => {
      const mockContainer = {
        inspect: vi.fn().mockResolvedValue({
          State: {
            Health: {
              Status: "unhealthy",
              FailingStreak: 3,
              Log: [],
            },
          },
        }),
      };

      mockDocker.getContainer.mockReturnValueOnce(mockContainer);

      const result = await runner.getContainerHealth("container1");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe("unhealthy");
        expect(result.value.failingStreak).toBe(3);
      }
    });

    it("should handle container without health check", async () => {
      const mockContainer = {
        inspect: vi.fn().mockResolvedValue({
          State: {},
        }),
      };

      mockDocker.getContainer.mockReturnValueOnce(mockContainer);

      const result = await runner.getContainerHealth("container1");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe("none");
      }
    });
  });

  describe("getContainerStats", () => {
    it("should get container stats", async () => {
      const mockContainer = {
        stats: vi.fn().mockResolvedValue({
          cpu_stats: {
            cpu_usage: { total_usage: 200000000 },
            system_cpu_usage: 1000000000,
            online_cpus: 4,
          },
          precpu_stats: {
            cpu_usage: { total_usage: 100000000 },
            system_cpu_usage: 900000000,
          },
          memory_stats: {
            usage: 104857600, // 100MB
            limit: 1073741824, // 1GB
          },
          networks: {
            eth0: {
              rx_bytes: 1000000,
              tx_bytes: 500000,
            },
          },
          blkio_stats: {
            io_service_bytes_recursive: [
              { op: "read", value: 2000000 },
              { op: "write", value: 1000000 },
            ],
          },
          pids_stats: {
            current: 10,
          },
        }),
      };

      mockDocker.getContainer.mockReturnValueOnce(mockContainer);

      const result = await runner.getContainerStats("container1");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.cpuPercent).toBeGreaterThan(0);
        expect(result.value.memoryUsage.usage).toBe(104857600);
        expect(result.value.memoryUsage.limit).toBe(1073741824);
        expect(result.value.memoryUsage.percent).toBeCloseTo(9.77, 1);
        expect(result.value.network.rx).toBe(1000000);
        expect(result.value.network.tx).toBe(500000);
        expect(result.value.blockIO.read).toBe(2000000);
        expect(result.value.blockIO.write).toBe(1000000);
        expect(result.value.pids).toBe(10);
      }
    });
  });

  describe("getContainerLogs", () => {
    it("should get container logs", async () => {
      const mockLogs = "Log line 1\nLog line 2\nLog line 3";
      const mockContainer = {
        logs: vi.fn().mockResolvedValue(Buffer.from(mockLogs)),
      };

      mockDocker.getContainer.mockReturnValueOnce(mockContainer);

      const result = await runner.getContainerLogs("container1");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(mockLogs);
      }
    });

    it("should get logs with options", async () => {
      const mockContainer = {
        logs: vi.fn().mockResolvedValue(Buffer.from("logs")),
      };

      mockDocker.getContainer.mockReturnValueOnce(mockContainer);

      await runner.getContainerLogs("container1", {
        tail: 100,
        timestamps: true,
        follow: false,
      });

      expect(mockContainer.logs).toHaveBeenCalledWith({
        follow: false,
        stdout: true,
        stderr: true,
        timestamps: true,
        tail: 100,
        since: undefined,
      });
    });
  });

  describe("listImages", () => {
    it("should list images", async () => {
      mockDocker.listImages.mockResolvedValueOnce([
        {
          Id: "image1",
          RepoTags: ["nginx:latest", "nginx:1.25"],
          Size: 142000000,
          Created: 1704067200,
        },
        {
          Id: "image2",
          RepoTags: ["postgres:15"],
          Size: 379000000,
          Created: 1704067200,
        },
      ]);

      const result = await runner.listImages();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0].tags).toContain("nginx:latest");
        expect(result.value[1].tags).toContain("postgres:15");
      }
    });
  });

  describe("pullImage", () => {
    it("should pull image", async () => {
      const mockStream = {};
      mockDocker.pull.mockImplementation(
        (name: string, callback: (err: null, stream: any) => void) => {
          callback(null, mockStream);
        },
      );

      mockDocker.modem.followProgress.mockImplementation(
        (_stream: any, callback: (err: null) => void) => {
          callback(null);
        },
      );

      const result = await runner.pullImage("nginx:latest");

      expect(result.ok).toBe(true);
      expect(mockDocker.pull).toHaveBeenCalledWith("nginx:latest", expect.any(Function));
    });

    it("should handle pull errors", async () => {
      mockDocker.pull.mockImplementation((_name: string, callback: (err: Error) => void) => {
        callback(new Error("Image not found"));
      });

      const result = await runner.pullImage("invalid:tag");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.operation).toBe(DockerOperation.IMAGE_PULL);
      }
    });
  });

  describe("listNetworks", () => {
    it("should list networks", async () => {
      mockDocker.listNetworks.mockResolvedValueOnce([
        {
          Id: "network1",
          Name: "bridge",
          Driver: "bridge",
          Scope: "local",
        },
        {
          Id: "network2",
          Name: "app-network",
          Driver: "bridge",
          Scope: "local",
        },
      ]);

      const result = await runner.listNetworks();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0].name).toBe("bridge");
        expect(result.value[1].name).toBe("app-network");
      }
    });
  });

  describe("listVolumes", () => {
    it("should list volumes", async () => {
      mockDocker.listVolumes.mockResolvedValueOnce({
        Volumes: [
          {
            Name: "app-data",
            Driver: "local",
            Mountpoint: "/var/lib/docker/volumes/app-data/_data",
            CreatedAt: "2024-01-01T00:00:00Z",
          },
          {
            Name: "db-data",
            Driver: "local",
            Mountpoint: "/var/lib/docker/volumes/db-data/_data",
            CreatedAt: "2024-01-01T00:00:00Z",
          },
        ],
      });

      const result = await runner.listVolumes();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0].name).toBe("app-data");
        expect(result.value[1].name).toBe("db-data");
      }
    });

    it("should handle empty volume list", async () => {
      mockDocker.listVolumes.mockResolvedValueOnce({
        Volumes: null,
      });

      const result = await runner.listVolumes();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(0);
      }
    });
  });
});
