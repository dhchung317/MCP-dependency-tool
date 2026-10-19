import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";
import { listDependencies } from "./dependencies.js";
import { findDependencyUsage } from "./usage.js";
import { resolve } from "node:path";
import { getPackageVersion } from "./registry.js";
import { getLockedDependency } from "./lockfile.js";

function createServer(): McpServer {
  const server = new McpServer({
    name: "dependency-assistant",
    version: "0.1.0",
  });

  const repoPath = resolve(process.env.REPO_PATH ?? process.cwd());

  server.registerTool(
    "list_dependencies",
    {
      description:
        "List declared production and development dependencies of the configured repository.",
      inputSchema: z.object({}),
    },
    async () => {
      const deps = await listDependencies(repoPath);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(deps, null, 2),
          },
        ],
      };
    },
  );

  server.registerTool(
    "find_dependency_usage",
    {
      description:
        "Find same-file references to direct ES import bindings from a package or its subpaths in JavaScript and TypeScript files. Returns expressions and source locations. Does not follow re-exports, wrappers, CommonJS require, or dynamic imports.",
      inputSchema: z.object({
        packageName: z
          .string()
          .trim()
          .min(1)
          .describe(
            "Dependency package name, for example zod or @modelcontextprotocol/server",
          ),
      }),
    },
    async ({ packageName }) => {
      const usages = await findDependencyUsage(repoPath, packageName);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(usages, null, 2),
          },
        ],
      };
    },
  );

  server.registerTool(
    "get_package_version",
    {
      inputSchema: z.object({
        packageName: z.string().trim().min(1),
        version: z
          .string()
          .trim()
          .min(1)
          .describe("Exact target version, for example 4.3.5"),
      }),
    },
    async ({ packageName, version }) => {
      const info = await getPackageVersion(packageName, version);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(info, null, 2),
          },
        ],
      };
    },
  );

  server.registerTool(
    "get_locked_dependency",
    {
      description:
        "Read a package's top-level locked version from npm package-lock.json v2 or v3. Does not inspect node_modules or nested package copies.",
      inputSchema: z.object({
        packageName: z.string().trim().min(1),
      }),
    },
    async ({ packageName }) => {
      const info = await getLockedDependency(repoPath, packageName);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(info, null, 2),
          },
        ],
      };
    },
  );

  return server;
}

void serveStdio(createServer);
