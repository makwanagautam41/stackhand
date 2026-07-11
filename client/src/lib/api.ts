import type {
  BackendWorkspace,
  BackendStack,
  BackendContainer,
  BackendImage,
  DashboardData,
  OllamaStatus,
  OllamaChatResponse,
  GenerateStackResponse,
  RegistryImage,
  OllamaModelInfo,
  OllamaVersion,
  OllamaChatOptions,
  OllamaFullChatResponse,
  AiSession,
  AiMessage,
  WebSearchResult,
  SearchStatus,
  SearchLog,
} from "./types";
import type { DockerStatus, YamlFile } from "./types";

const TOKEN_KEY = "stackhand-api-token";

function getApiBase(): string {
  const configured =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
    process.env.API_URL;
  if (configured) return configured.replace(/\/$/, "");

  // In the browser, default to the current origin so the Vite proxy or
  // backend-served frontend can forward requests without CORS issues.
  if (typeof window !== "undefined") {
    return "/api";
  }

  return "http://127.0.0.1:4000/api";
}

function getToken(): string {
  const envToken =
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_STACKHAND_API_TOKEN) ||
    (typeof process !== "undefined" && process.env.STACKHAND_API_TOKEN);
  if (envToken) return envToken;
  if (typeof window === 'undefined') return "dev-token";
  return localStorage.getItem(TOKEN_KEY) || "dev-token";
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getStoredToken(): string {
  return getToken();
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${getToken()}`,
    ...(options.headers as Record<string, string>),
  };
  if (options.body && typeof options.body === "string") {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${getApiBase()}${path}`, { ...options, headers });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.text();
      try {
        const json = JSON.parse(body);
        msg = json.message || json.error || msg;
      } catch {
        msg = body || msg;
      }
    } catch {}
    throw new Error(msg);
  }
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text);
}

function mapWorkspace(bw: BackendWorkspace) {
  return {
    id: bw.id,
    name: bw.name,
    description: bw.description || undefined,
    color: bw.color,
    icon: bw.icon,
    rootFolder: bw.rootFolderPath || "",
    ollamaConnected: false,
    models: [],
    createdAt: bw.createdAt,
  };
}

function mapStackDetail(bs: any) {
  const services: string[] = [];
  if (bs.services && Array.isArray(bs.services)) {
    for (const s of bs.services) {
      if (typeof s === "object" && s.name) services.push(s.name);
    }
  }
  return {
    id: bs.id,
    workspaceId: bs.workspaceId,
    name: bs.name,
    yamlPath: bs.folderPath || bs.folder_path || "",
    status: bs.status || "unknown",
    services,
    containers: [],
    lastModified: bs.updatedAt || bs.createdAt || "",
    yaml: bs.yaml || "",
    runningYaml: undefined,
  };
}

export const api = {
  // ---- Health ----
  async health() {
    return request<{ status: string; timestamp: string }>("/health");
  },

  // ---- Workspaces ----
  async listWorkspaces() {
    const data = await request<BackendWorkspace[]>("/workspaces");
    return data.map(mapWorkspace);
  },

  async getWorkspace(id: string) {
    const data = await request<BackendWorkspace>(`/workspaces/${id}`);
    return mapWorkspace(data);
  },

  async createWorkspace(data: { name: string; description?: string; color?: string; icon?: string; rootFolderPath?: string }) {
    const res = await request<BackendWorkspace>("/workspaces", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return mapWorkspace(res);
  },

  async updateWorkspace(id: string, data: { name?: string; description?: string; color?: string; icon?: string; rootFolderPath?: string }) {
    const res = await request<BackendWorkspace>(`/workspaces/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    return mapWorkspace(res);
  },

  async deleteWorkspace(id: string, alsoDeleteFolder?: boolean) {
    return request<{ message: string }>(`/workspaces/${id}`, {
      method: "DELETE",
      body: alsoDeleteFolder ? JSON.stringify({ alsoDeleteFolder: true }) : undefined,
    });
  },

  async validateWorkspacePath(path: string) {
    return request<{ valid: boolean; path: string; error?: string }>("/workspaces/validate-path", {
      method: "POST",
      body: JSON.stringify({ path }),
    });
  },

  // ---- Filesystem ----
  async getFileTree(basePath: string, subPath?: string) {
    return request<YamlFile>("/filesystem/tree", {
      method: "POST",
      body: JSON.stringify({ basePath, subPath }),
    });
  },

  async browseFolder(basePath: string, subPath?: string) {
    return request<{ name: string; type: string; size: number; modifiedAt: string }[]>("/filesystem/browse", {
      method: "POST",
      body: JSON.stringify({ basePath, subPath }),
    });
  },

  async readFile(filePath: string) {
    return request<{ path: string; content: string }>("/filesystem/read", {
      method: "POST",
      body: JSON.stringify({ filePath }),
    });
  },

  async writeFile(filePath: string, content: string) {
    return request<{ path: string; content: string }>("/filesystem/write", {
      method: "POST",
      body: JSON.stringify({ filePath, content }),
    });
  },

  async createFolder(parentPath: string, name: string) {
    return request<{ path: string; name: string }>("/filesystem/create-folder", {
      method: "POST",
      body: JSON.stringify({ parentPath, name }),
    });
  },

  async renameNode(path: string, newName: string) {
    return request<{ oldPath: string; newPath: string }>("/filesystem/rename", {
      method: "POST",
      body: JSON.stringify({ path, newName }),
    });
  },

  async deleteNode(path: string) {
    return request<{ deleted: string }>("/filesystem/delete", {
      method: "POST",
      body: JSON.stringify({ path }),
    });
  },

  async duplicateFile(path: string) {
    return request<{ original: string; copy: string }>("/filesystem/duplicate", {
      method: "POST",
      body: JSON.stringify({ path }),
    });
  },

  // ---- Stacks ----
  async listStacks(workspaceId: string) {
    const data = await request<BackendStack[]>(`/workspaces/${workspaceId}/stacks`);
    return data.map(mapStackDetail);
  },

  async getStack(id: string) {
    const data = await request<any>(`/stacks/${id}`);
    return mapStackDetail(data);
  },

  async createStack(workspaceId: string, data: { name: string; yaml: string; folderName?: string; envContent?: string }) {
    const res = await request<BackendStack>(`/workspaces/${workspaceId}/stacks`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    return mapStackDetail(res);
  },

  async updateStackYaml(id: string, yaml: string) {
    return request<{ message: string }>(`/stacks/${id}/yaml`, {
      method: "PUT",
      body: JSON.stringify({ yaml }),
    });
  },

  async deleteStack(id: string, deleteFolder?: boolean) {
    const qs = deleteFolder ? "?deleteFolder=true" : "";
    return request<{ message: string }>(`/stacks/${id}${qs}`, { method: "DELETE" });
  },

  async composeUp(id: string) {
    return request<{ stdout: string; stderr: string }>(`/stacks/${id}/up`, { method: "POST" });
  },

  async composeUpFromYaml(yamlPath: string, yamlContent: string, workspaceId?: string) {
    return request<{ message: string; containerId: string }>("/stacks/from-yaml", {
      method: "POST",
      body: JSON.stringify({ yamlPath, yamlContent, workspaceId }),
    });
  },

  async composeDown(id: string) {
    return request<{ stdout: string; stderr: string }>(`/stacks/${id}/down`, { method: "POST" });
  },

  async composeRestart(id: string) {
    return request<{ stdout: string; stderr: string }>(`/stacks/${id}/restart`, { method: "POST" });
  },

  async getStackLogs(id: string, tail = 200) {
    return request<{ stdout: string; stderr: string }>(`/stacks/${id}/logs?tail=${tail}`);
  },

  async listTemplates() {
    return request<any[]>("/stack-templates");
  },

  async generateFromTemplate(templateId: string, overrides: Record<string, string>) {
    return request<{ yaml: string; template: string }>(`/stack-templates/${templateId}/generate`, {
      method: "POST",
      body: JSON.stringify(overrides),
    });
  },

  // ---- Containers ----
  async listContainers(workspaceId?: string) {
    const query = workspaceId ? `?workspaceId=${workspaceId}` : "";
    const data = await request<any[]>(`/containers${query}`);
    return data.map((c: any) => ({
      id: c.id,
      name: c.name,
      image: c.image,
      status: c.status || "unknown",  // machine state: "running", "exited", etc.
      state: c.state || c.status || "unknown", // human-readable: "Up 2 hours", etc.
      ports: (c.ports || []).map((p: any) => ({
        host: p.host || 0,
        container: p.container || 0,
        protocol: p.protocol || "tcp",
      })),
      created: c.created,
      cpu: 0,
      mem: 0,
    }));
  },

  async inspectContainer(id: string) {
    return request<any>(`/containers/${id}`);
  },

  async startContainer(id: string) {
    return request<{ message: string }>(`/containers/${id}/start`, { method: "POST" });
  },

  async createContainer(data: { image: string; name?: string; port?: number; env?: Record<string, string>; volumes?: string[]; cmd?: string[] }) {
    return request<{ id: string; name: string; image: string; status: string }>("/containers", { method: "POST", body: JSON.stringify(data) });
  },

  async stopContainer(id: string) {
    return request<{ message: string }>(`/containers/${id}/stop`, { method: "POST" });
  },

  async restartContainer(id: string) {
    return request<{ message: string }>(`/containers/${id}/restart`, { method: "POST" });
  },

  async removeContainer(id: string) {
    return request<{ message: string }>(`/containers/${id}`, { method: "DELETE" });
  },

  async containerStats(id: string) {
    return request<any>(`/containers/${id}/stats`);
  },

  async containerLogs(id: string, tail = 200) {
    return request<string>(`/containers/${id}/logs?tail=${tail}`);
  },

  // ---- Images ----
  async listImages() {
    return request<BackendImage[]>("/images");
  },

  async searchDockerHub(query: string) {
    return request<RegistryImage[]>(`/images/search?q=${encodeURIComponent(query)}`);
  },

  async getImageTags(namespace: string, name: string) {
    return request<string[]>(`/images/tags/${namespace}/${name}`);
  },

  async pullImage(name: string) {
    return request<{ message: string }>("/images/pull", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  },

  async removeImage(name: string) {
    return request<{ message: string }>(`/images/${encodeURIComponent(name)}`, { method: "DELETE" });
  },

  // ---- Volumes ----
  async listVolumes() {
    return request<{ name: string; driver: string; mountpoint: string; scope: string; size: number; refCount: number; created: string; labels: Record<string, string> }[]>("/volumes");
  },

  async inspectVolume(name: string) {
    return request<any>(`/volumes/${encodeURIComponent(name)}`);
  },

  async removeVolume(name: string) {
    return request<{ message: string }>(`/volumes/${encodeURIComponent(name)}`, { method: "DELETE" });
  },

  async pruneVolumes() {
    return request<{ message: string; reclaimed: number }>("/volumes/prune", { method: "POST" });
  },

  // ---- Volume Files ----
  async browseVolumeFiles(name: string, subPath?: string) {
    const qs = subPath ? `?path=${encodeURIComponent(subPath)}` : '';
    return request<any>(`/volumes/${encodeURIComponent(name)}/files${qs}`);
  },

  async readVolumeFile(name: string, filePath: string) {
    return request<{ path: string; content: string; size: number }>(`/volumes/${encodeURIComponent(name)}/files/read?path=${encodeURIComponent(filePath)}`);
  },

  async getVolumeUsage(name: string) {
    return request<{ totalFiles: number; totalSize: number; mountpoint: string }>(`/volumes/${encodeURIComponent(name)}/usage`);
  },

  // ---- Registry ----
  async registrySearch(query: string, page = 1, pageSize = 25) {
    return request<{ results: any[]; total: number; page: number; pageSize: number }>(`/registry/search?q=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}`);
  },

  async registryRepository(namespace: string, repo: string) {
    return request<any>(`/registry/repository/${encodeURIComponent(namespace)}/${encodeURIComponent(repo)}`);
  },

  async registryTags(namespace: string, repo: string, page = 1, pageSize = 50) {
    return request<{ results: any[]; total: number; page: number; pageSize: number }>(`/registry/repository/${encodeURIComponent(namespace)}/${encodeURIComponent(repo)}/tags?page=${page}&pageSize=${pageSize}`);
  },

  registryPullStreamUrl(name: string) {
    return `/api/registry/pull-stream?name=${encodeURIComponent(name)}`;
  },

  async registryPull(name: string) {
    return request<{ message: string }>("/registry/pull", { method: "POST", body: JSON.stringify({ name }) });
  },

  async registryGenerateCompose(data: { image: string; name?: string; port?: number; env?: Record<string, string>; volumes?: string[] }) {
    return request<{ yaml: string; image: string; name: string }>("/registry/generate-compose", { method: "POST", body: JSON.stringify(data) });
  },

  async registrySaveToWorkspace(data: { workspaceRoot: string; folderName: string; yaml: string; description?: string }) {
    return request<{ message: string; path: string }>("/registry/save-workspace", { method: "POST", body: JSON.stringify(data) });
  },

  async registryPopular() {
    return request<{ title: string; query: string; images: any[] }[]>("/registry/popular");
  },

  // ---- Ollama ----
  async ollamaStatus() {
    return request<OllamaStatus>("/ollama/status");
  },

  async ollamaVersion() {
    return request<OllamaVersion>("/ollama/version");
  },

  async ollamaModels() {
    return request<{ id: string; name: string; size: number; modifiedAt: string }[]>("/ollama/models");
  },

  async ollamaModelInfo(name: string) {
    return request<OllamaModelInfo>(`/ollama/model/${encodeURIComponent(name)}`);
  },

  async ollamaChat(
    model: string,
    messages: { role: string; content: string }[],
    options?: OllamaChatOptions,
  ) {
    return request<OllamaFullChatResponse>("/ollama/chat", {
      method: "POST",
      body: JSON.stringify({ model, messages, options }),
    });
  },

  ollamaChatStreamUrl() {
    return `${getApiBase()}/ollama/chat/stream`;
  },

  async ollamaPull(name: string) {
    return request<{ status: string }>("/ollama/pull", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  },

  async ollamaDeleteModel(name: string) {
    return request<{ deleted: boolean }>(`/ollama/model/${encodeURIComponent(name)}`, {
      method: "DELETE",
    });
  },

  async generateStack(description: string) {
    return request<GenerateStackResponse>("/ollama/generate-stack", {
      method: "POST",
      body: JSON.stringify({ description }),
    });
  },

  // ---- Web Search ----
  async webSearch(query: string, maxResults?: number, engine?: string) {
    return request<{ results: WebSearchResult[] }>("/search/web", {
      method: "POST",
      body: JSON.stringify({ query, maxResults, engine }),
    });
  },

  async webSearchStatus() {
    return request<SearchStatus>("/search/status");
  },

  async webSearchLogs(engine?: string, limit = 20) {
    const params = new URLSearchParams();
    if (engine) params.set("engine", engine);
    params.set("limit", String(limit));
    return request<SearchLog[]>(`/search/logs?${params}`);
  },

  async webSearchDeleteLog(id: string) {
    return request<void>(`/search/logs/${id}`, { method: "DELETE" });
  },

  // ---- AI Sessions ----
  async listAiSessions(workspaceId: string) {
    return request<AiSession[]>(`/ai-sessions?workspaceId=${encodeURIComponent(workspaceId)}`);
  },

  async getAiSession(id: string) {
    return request<AiSession>(`/ai-sessions/${id}`);
  },

  async createAiSession(data: { workspaceId: string; name: string; model?: string }) {
    return request<AiSession>("/ai-sessions", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateAiSession(id: string, data: { name?: string; model?: string }) {
    return request<AiSession>(`/ai-sessions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async deleteAiSession(id: string) {
    return request<void>(`/ai-sessions/${id}`, { method: "DELETE" });
  },

  async addAiMessage(sessionId: string, data: { role: string; content: string }) {
    return request<AiMessage>(`/ai-sessions/${sessionId}/messages`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateAiMessage(sessionId: string, messageId: string, content: string) {
    return request<AiMessage>(`/ai-sessions/${sessionId}/messages/${messageId}`, {
      method: "PATCH",
      body: JSON.stringify({ content }),
    });
  },

  // ---- Docker ----
  async dockerStatus() {
    return request<DockerStatus>("/docker/status");
  },

  async dockerPing() {
    return request<{ alive: boolean }>("/docker/ping");
  },

  // ---- Backups ----
  async backupWorkspace(workspaceId: string) {
    return request<{ message: string; path: string; timestamp: string; files: number }>(`/workspaces/${workspaceId}/backup`, { method: "POST" });
  },

  async listBackups(workspaceId: string) {
    return request<{ name: string; path: string; createdAt: string; fileCount: number; size: number }[]>(`/workspaces/${workspaceId}/backups`);
  },

  async restoreBackup(workspaceId: string, snapshotName: string) {
    return request<{ message: string; path: string }>(`/workspaces/${workspaceId}/backups/${snapshotName}/restore`, { method: "POST" });
  },

  async deleteBackup(workspaceId: string, snapshotName: string) {
    return request<{ message: string }>(`/workspaces/${workspaceId}/backups/${snapshotName}`, { method: "DELETE" });
  },

  // ---- Dashboard ----
  async getDashboard() {
    return request<DashboardData>("/dashboard");
  },

  // ---- Settings ----
  async getSettings() {
    return request<Record<string, any>>("/settings");
  },

  async updateSettings(value: Record<string, any>) {
    return request<Record<string, any>>("/settings", {
      method: "PUT",
      body: JSON.stringify(value),
    });
  },

  // ---- Database ----
  async dbListTables() {
    return request<string[]>("/db/tables");
  },

  async dbGetTableSchema(table: string) {
    return request<{ table: string; columns: { cid: number; name: string; type: string; notNull: boolean; default: string | null; primaryKey: boolean }[]; rowCount: number }>(`/db/${encodeURIComponent(table)}/schema`);
  },

  async dbGetRows(table: string, limit = 50, offset = 0) {
    return request<Record<string, any>[]>(`/db/${encodeURIComponent(table)}/rows?limit=${limit}&offset=${offset}`);
  },

  async dbGetRow(table: string, id: string, pk = "id") {
    return request<Record<string, any> | null>(`/db/${encodeURIComponent(table)}/rows/${encodeURIComponent(id)}?pk=${encodeURIComponent(pk)}`);
  },

  async dbCreateRow(table: string, data: Record<string, any>) {
    return request<{ inserted: boolean; rowId: number }>(`/db/${encodeURIComponent(table)}/rows`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async dbUpdateRow(table: string, id: string, data: Record<string, any>, pk = "id") {
    return request<{ updated: boolean }>(`/db/${encodeURIComponent(table)}/rows/${encodeURIComponent(id)}?pk=${encodeURIComponent(pk)}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async dbDeleteRow(table: string, id: string, pk = "id") {
    return request<{ deleted: boolean }>(`/db/${encodeURIComponent(table)}/rows/${encodeURIComponent(id)}?pk=${encodeURIComponent(pk)}`, {
      method: "DELETE",
    });
  },

  async dbExecuteQuery(sql: string) {
    return request<{ type: "select"; rows: Record<string, any>[] } | { type: "execute"; affected: number }>("/db/query", {
      method: "POST",
      body: JSON.stringify({ sql }),
    });
  },
};
