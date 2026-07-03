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
} from "./types";

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
  if (typeof window === 'undefined') return process.env.STACKHAND_API_TOKEN || "dev-token";
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
  async listContainers() {
    const data = await request<any[]>("/containers");
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

  // ---- Ollama ----
  async ollamaStatus() {
    return request<OllamaStatus>("/ollama/status");
  },

  async ollamaModels() {
    return request<{ id: string; name: string; size: number; modifiedAt: string }[]>("/ollama/models");
  },

  async ollamaChat(model: string, messages: { role: string; content: string }[]) {
    return request<OllamaChatResponse>("/ollama/chat", {
      method: "POST",
      body: JSON.stringify({ model, messages }),
    });
  },

  async generateStack(description: string) {
    return request<GenerateStackResponse>("/ollama/generate-stack", {
      method: "POST",
      body: JSON.stringify({ description }),
    });
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
};
