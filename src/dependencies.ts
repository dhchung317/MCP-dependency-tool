import { readFile } from "node:fs/promises";
import { join } from "node:path";
import * as z from "zod/v4";

const packageManifestSchema = z.object({
  dependencies: z.record(z.string(), z.string()).optional(),
  devDependencies: z.record(z.string(), z.string()).optional(),
});

export type Dependency = {
  name: string;
  versionRange: string;
  kind: "production" | "development";
};

export async function listDependencies(
  repoPath: string,
): Promise<Dependency[]> {
  const filePath = join(repoPath, "package.json");
  const data = await readFile(filePath, { encoding: "utf-8" });
  const parsed = packageManifestSchema.parse(JSON.parse(data));

  const deps: Dependency[] = Object.entries(parsed.dependencies ?? {}).map(
    ([name, versionRange]): Dependency => ({
      name,
      versionRange,
      kind: "production",
    }),
  );
  const devDeps: Dependency[] = Object.entries(
    parsed.devDependencies ?? {},
  ).map(
    ([name, versionRange]): Dependency => ({
      name,
      versionRange,
      kind: "development",
    }),
  );

  return [...deps, ...devDeps];
}
