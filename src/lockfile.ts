import { readFile } from "node:fs/promises";
import { join } from "node:path";
import z from "zod";

const supported = [2, 3];

const lockFileSchema = z.object({
  lockfileVersion: z.number(),
  packages: z.record(z.string(), z.object({ version: z.string().optional() })),
});

export type LockedDependency = {
  name: string;
  version: string;
};

export async function getLockedDependency(
  repoPath: string,
  packageName: string,
): Promise<LockedDependency | null> {
  const filePath = join(repoPath, "package-lock.json");

  const data = await readFile(filePath, { encoding: "utf-8" });
  const raw: unknown = JSON.parse(data);

  const header = z
    .object({
      lockfileVersion: z.number(),
    })
    .parse(raw);

  if (!supported.includes(header["lockfileVersion"])) {
    throw new Error("Currently only lock file versions 2 and 3 are supported");
  }
  const parsed = lockFileSchema.parse(raw);

  const entry = parsed.packages[`node_modules/${packageName}`];

  return entry?.version ? { name: packageName, version: entry.version } : null;
}
