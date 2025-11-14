import * as fs from 'fs/promises';
import * as path from 'path';

// TODO: Integrate with a proper user permission prompt mechanism.
// This is a placeholder for the permission check.
type PermissionCallback = (path: string) => Promise<boolean>;
const defaultPermissionCallback: PermissionCallback = async (_path: string) => {
  // For now, always grant permission.
  return true;
};

export interface RepoNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: RepoNode[];
}

export interface RepoMapResult {
  structure: RepoNode;
  fileQueue: string[];
}

/**
 * Recursively maps a directory structure, checking for permissions along the way.
 * @param dirPath The absolute path to the directory to map.
 * @param checkPermission A callback function to ask for user permission to access a directory.
 * @param fileQueue An array to collect file paths.
 * @returns A node representing the directory structure.
 */
async function mapDirectory(
  dirPath: string,
  checkPermission: PermissionCallback,
  fileQueue: string[],
): Promise<RepoNode> {
  const name = path.basename(dirPath);
  const rootNode: RepoNode = { name, path: dirPath, type: 'directory', children: [] };

  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      // Placeholder for permission check
      const hasPermission = await checkPermission(entryPath);
      if (hasPermission && rootNode.children) {
        // TODO: Add logic to handle .gitignore and other ignore files.
        const childNode = await mapDirectory(entryPath, checkPermission, fileQueue);
        rootNode.children.push(childNode);
      }
    } else if (entry.isFile()) {
      fileQueue.push(entryPath);
      if (rootNode.children) {
        rootNode.children.push({ name: entry.name, path: entryPath, type: 'file' });
      }
    }
  }

  return rootNode;
}

/**
 * Creates a map of the repository, separating the directory structure from a file queue.
 * It respects user permissions for traversing directories.
 *
 * @param rootPath The root directory of the repository to map.
 * @param checkPermission Optional callback to verify access permissions.
 * @returns An object containing the directory structure and a queue of files to be scanned.
 */
export async function createRepoMap(
  rootPath: string,
  checkPermission: PermissionCallback = defaultPermissionCallback,
): Promise<RepoMapResult> {
  const fileQueue: string[] = [];
  const structure = await mapDirectory(rootPath, checkPermission, fileQueue);

  return {
    structure,
    fileQueue,
  };
}
