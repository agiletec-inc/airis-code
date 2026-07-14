import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

type Matrix = {
  components: Array<{ name: string; coreImport: boolean; forbiddenImportTokens?: string[] }>;
};

async function sourceFiles(root: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory() && !["node_modules", "dist"].includes(entry.name))
      files.push(...(await sourceFiles(path)));
    else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) files.push(path);
  }
  return files;
}

const matrix = JSON.parse(await readFile("docs/AIROS_LICENSE_MATRIX.json", "utf8")) as Matrix;
const forbidden = matrix.components.flatMap((component) =>
  component.coreImport ? [] : (component.forbiddenImportTokens ?? []),
);
const files = await sourceFiles("apps");
const hits: string[] = [];
for (const file of files) {
  const source = await readFile(file, "utf8");
  for (const token of forbidden)
    if (source.includes(token)) hits.push(`${file}: forbidden token ${token}`);
}
if (hits.length > 0) {
  process.stderr.write(`${hits.join("\n")}\n`);
  process.exit(1);
}
process.stdout.write(
  `license policy: PASS (${matrix.components.length} components, ${files.length} source files)\n`,
);
