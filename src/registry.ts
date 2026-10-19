import z from "zod";

const packageVersionSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string().optional(),
  homepage: z.string().optional(),
  engines: z.record(z.string(), z.string()).optional(),
  peerDependencies: z.record(z.string(), z.string()).optional(),
});

export type PackageVersionInfo = z.infer<typeof packageVersionSchema>;

export async function getPackageVersion(
  packageName: string,
  version: string,
): Promise<PackageVersionInfo> {
  // Your implementation
  const res = await fetch(
    `https://registry.npmjs.org/${encodeURIComponent(packageName)}/${encodeURIComponent(version)}`,
  );

  if (!res.ok) {
    throw new Error(
      `Failed to fetch ${packageName}@${version}: HTTP ${res.status}`,
    );
  }

  const parsed = packageVersionSchema.parse(await res.json());

  return parsed;
}
