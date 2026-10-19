import { readdir } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { collectReferences, type ImportReference } from "./references.js";
import ts from "typescript-compiler";

const skip = ["node_modules", ".git", "dist", "build", "coverage"];

const include = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

export type DependencyUsage = ImportReference & {
  path: string;
};

export async function findDependencyUsage(
  repoPath: string,
  packageName: string,
): Promise<DependencyUsage[]> {
  const usages: DependencyUsage[] = [];
  const filePaths: string[] = [];

  async function walk(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });

    await Promise.all(
      entries.map(async (entry) => {
        const fullPath = join(directory, entry.name);
        if (entry.isDirectory() && !skip.includes(entry.name)) {
          // Recursively process subdirectory
          await walk(fullPath);
        } else if (entry.isFile() && include.includes(extname(entry.name))) {
          filePaths.push(fullPath);
        }
      }),
    );
  }

  await walk(repoPath);

  const program = ts.createProgram({
    rootNames: filePaths,
    options: {
      allowJs: true,
      noEmit: true,
      target: ts.ScriptTarget.Latest,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
    },
  });

  const checker = program.getTypeChecker();

  filePaths.forEach((filePath) => {
    const sourceFile = program.getSourceFile(filePath);
    if (!sourceFile) throw new Error("source file error");

    const references = collectReferences(sourceFile, checker, packageName);
    const path = relative(repoPath, filePath);

    references.forEach((reference) => {
      usages.push({ ...reference, path });
    });
  });

  return usages;
}
