import * as fs from 'fs/promises';

export interface FileReadResult {
  filePath: string;
  content: string;
}

export interface ParallelReadResult {
  successfulReads: FileReadResult[];
  failedReads: {
    filePath: string;
    reason: any;
  }[];
}

const MAX_CONCURRENCY = 10; // As suggested by the user's plan (10-16)

/**
 * Reads the content of files from a queue in parallel with limited concurrency.
 *
 * @param fileQueue An array of absolute file paths to read.
 * @returns An object containing successfully read files and failures.
 */
export async function readFilesParallel(fileQueue: string[]): Promise<ParallelReadResult> {
  const successfulReads: FileReadResult[] = [];
  const failedReads: { filePath: string; reason: any }[] = [];
  const queue = [...fileQueue];

  async function worker() {
    while (queue.length > 0) {
      const filePath = queue.shift();
      if (!filePath) continue;

      try {
        // TODO: Add handling for binary files. For now, assume utf-8.
        const content = await fs.readFile(filePath, 'utf-8');
        successfulReads.push({ filePath, content });
      } catch (error) {
        failedReads.push({ filePath, reason: error });
      }
    }
  }

  const workers = Array(MAX_CONCURRENCY).fill(null).map(worker);
  await Promise.all(workers);

  return { successfulReads, failedReads };
}
