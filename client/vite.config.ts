// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

function readRootEnv() {
  const envPath = path.resolve(here, "..", ".env");
  if (!fs.existsSync(envPath)) return new Map<string, string>();

  const entries = new Map<string, string>();
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const rawValue = trimmed.slice(eqIndex + 1).trim();
    entries.set(key, rawValue.replace(/^['"]|['"]$/g, ""));
  }
  return entries;
}

function getBackendOrigin(rootEnv: Map<string, string>) {
  const explicit =
    process.env.STACKHAND_BACKEND_ORIGIN ||
    rootEnv.get("STACKHAND_BACKEND_ORIGIN");
  if (explicit) return explicit.replace(/\/$/, "");

  const host = process.env.HOST || rootEnv.get("HOST") || "127.0.0.1";
  const port = process.env.PORT || rootEnv.get("PORT") || "22443";
  const normalizedHost = host === "0.0.0.0" ? "127.0.0.1" : host;
  return `http://${normalizedHost}:${port}`;
}

function getFrontendPort(rootEnv: Map<string, string>) {
  return parseInt(
    process.env.FRONTEND_PORT || rootEnv.get("FRONTEND_PORT") || "22080",
    10,
  );
}

function getApiToken(rootEnv: Map<string, string>) {
  return process.env.STACKHAND_API_TOKEN || rootEnv.get("STACKHAND_API_TOKEN") || "dev-token";
}

const rootEnv = readRootEnv();
const backendOrigin = getBackendOrigin(rootEnv);
const frontendPort = getFrontendPort(rootEnv);
const apiToken = getApiToken(rootEnv);

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    define: {
      "import.meta.env.VITE_STACKHAND_API_TOKEN": JSON.stringify(apiToken),
    },
    server: {
      port: frontendPort,
      proxy: {
        "/api": { target: backendOrigin, changeOrigin: true },
        "/socket.io": { target: backendOrigin, ws: true, changeOrigin: true },
      },
    },
  },
});
