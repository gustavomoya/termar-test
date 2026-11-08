import { spawnSync } from "node:child_process";
import { createSerwistRoute } from "@serwist/turbopack";

const gitRevision = spawnSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf-8",
}).stdout?.trim();

const buildRevision =
  process.env.NODE_ENV === "production"
    ? Date.now().toString(36)
    : "dev";

const revision = gitRevision ? `${gitRevision}-${buildRevision}` : buildRevision;

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    additionalPrecacheEntries: [
      { url: "/", revision },
      { url: "/sync", revision },
      { url: "/~offline", revision },
    ],
    swSrc: "app/sw.ts",
    useNativeEsbuild: true,
  });
