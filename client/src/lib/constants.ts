import type { OllamaModel } from "./types";

export const DEFAULT_MODELS: OllamaModel[] = [
  { id: "phi3", name: "phi3:mini", size: "2.3 GB", enabled: true },
  { id: "llama", name: "llama3.2:1b", size: "1.3 GB", enabled: true },
  { id: "qwen", name: "qwen2.5:0.5b", size: "398 MB", enabled: false },
  { id: "mistral", name: "mistral:7b", size: "4.1 GB", enabled: false },
];

export const WORKSPACE_COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#14b8a6",
];

export const WORKSPACE_ICONS = [
  "Boxes",
  "Server",
  "Cpu",
  "Cloud",
  "Rocket",
  "FlaskConical",
  "Layers",
  "Container",
];
