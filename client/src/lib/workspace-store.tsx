import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  ActivityEvent,
  AlertRule,
  ChatMessage,
  Density,
  EnvFileEntry,
  EnvVar,
  Snippet,
  Stack,
  YamlFile,
  YamlVersion,
  Workspace,
} from "./types";
import { api } from "./api";
import { getStoredToken, setToken } from "./api";
import { uuid } from "./utils";

export { getStoredToken, setToken };

interface WorkspaceStore {
  workspaces: Workspace[];
  currentId: string | null;
  current: Workspace | null;
  stacksByWs: Record<string, Stack[]>;
  treeByWs: Record<string, YamlFile>;
  chatByWs: Record<string, ChatMessage[]>;
  chatByStack: Record<string, ChatMessage[]>;
  activityByWs: Record<string, ActivityEvent[]>;
  snippetsByWs: Record<string, Snippet[]>;
  alertsByWs: Record<string, AlertRule[]>;
  envFilesByWs: Record<string, EnvFileEntry[]>;
  yamlHistoryByStack: Record<string, YamlVersion[]>;
  density: Density;
  hydrated: boolean;
  loading: boolean;
  error: string | null;

  setCurrent: (id: string) => void;
  setDensity: (d: Density) => void;
  refresh: () => Promise<void>;
  refreshStacks: () => Promise<void>;
  addWorkspace: (name: string, opts?: { description?: string; color?: string; icon?: string; rootFolderPath?: string }) => Promise<Workspace>;
  updateWorkspace: (id: string, patch: { name?: string; description?: string; color?: string; icon?: string; rootFolderPath?: string }) => Promise<void>;
  deleteWorkspace: (id: string, alsoDeleteFolder?: boolean) => Promise<void>;

  addStack: (workspaceId: string, stack: Stack) => void;
  updateStack: (workspaceId: string, stackId: string, patch: Partial<Stack>) => void;
  deleteStack: (workspaceId: string, stackId: string) => Promise<void>;
  applyStackYaml: (workspaceId: string, stackId: string) => void;

  updateYamlFile: (workspaceId: string, fileId: string, content: string) => void;
  updateYamlEnv: (workspaceId: string, fileId: string, env: EnvVar[]) => void;
  renameYamlNode: (workspaceId: string, fileId: string, newName: string) => void;
  deleteYamlNode: (workspaceId: string, fileId: string) => void;
  duplicateYamlNode: (workspaceId: string, fileId: string) => string | null;
  createYamlChild: (workspaceId: string, parentId: string, name: string, isDir: boolean) => string | null;

  appendChat: (workspaceId: string, msg: ChatMessage) => void;
  clearChat: (workspaceId: string) => void;
  appendStackChat: (stackId: string, msg: ChatMessage) => void;
  clearStackChat: (stackId: string) => void;

  pushActivity: (workspaceId: string, ev: Omit<ActivityEvent, "id" | "ts">) => void;

  addSnippet: (workspaceId: string, s: Snippet) => void;
  deleteSnippet: (workspaceId: string, id: string) => void;

  addAlert: (workspaceId: string, a: AlertRule) => void;
  updateAlert: (workspaceId: string, id: string, patch: Partial<AlertRule>) => void;
  deleteAlert: (workspaceId: string, id: string) => void;

  updateEnvFile: (workspaceId: string, id: string, vars: EnvFileEntry["vars"]) => void;
  addEnvFile: (workspaceId: string, e: EnvFileEntry) => void;

  pushYamlVersion: (stackId: string, v: YamlVersion) => void;

  exportAll: () => string;
  importAll: (json: string) => boolean;
}

const Ctx = createContext<WorkspaceStore | null>(null);
const STORAGE_KEY = "stackhand-state-v2";
const TOKEN_STORAGE_KEY = "stackhand-api-token";

interface Persisted {
  currentId: string | null;
  chatByWs: Record<string, ChatMessage[]>;
  chatByStack: Record<string, ChatMessage[]>;
  snippetsByWs: Record<string, Snippet[]>;
  alertsByWs: Record<string, AlertRule[]>;
  envFilesByWs: Record<string, EnvFileEntry[]>;
  yamlHistoryByStack: Record<string, YamlVersion[]>;
  density: Density;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [stacksByWs, setStacksByWs] = useState<Record<string, Stack[]>>({});
  const [treeByWs, setTreeByWs] = useState<Record<string, YamlFile>>({});
  const [chatByWs, setChatByWs] = useState<Record<string, ChatMessage[]>>({});
  const [chatByStack, setChatByStack] = useState<Record<string, ChatMessage[]>>({});
  const [activityByWs, setActivityByWs] = useState<Record<string, ActivityEvent[]>>({});
  const [snippetsByWs, setSnippetsByWs] = useState<Record<string, Snippet[]>>({});
  const [alertsByWs, setAlertsByWs] = useState<Record<string, AlertRule[]>>({});
  const [envFilesByWs, setEnvFilesByWs] = useState<Record<string, EnvFileEntry[]>>({});
  const [yamlHistoryByStack, setYamlHistoryByStack] = useState<Record<string, YamlVersion[]>>({});
  const [density, setDensityState] = useState<Density>("comfortable");
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWorkspaces = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const ws = await api.listWorkspaces();
      setWorkspaces(ws);
      // Validate the restored currentId against actual workspaces.
      // If it's stale (deleted workspace) or absent, fall back to first workspace.
      setCurrentId((prev) => {
        if (!prev || !ws.find((w) => w.id === prev)) {
          return ws[0]?.id ?? null;
        }
        return prev;
      });
      setLoading(false);
      setHydrated(true);
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
      setHydrated(true);
    }
  }, []);

  const loadStacks = useCallback(async () => {
    if (!currentId) return;
    try {
      const stacks = await api.listStacks(currentId);
      setStacksByWs((prev) => ({ ...prev, [currentId]: stacks }));
    } catch (e: any) {
      // If the workspace no longer exists (404), clear it from the current selection
      // so the user is redirected to onboarding rather than stuck on an error.
      if (e.message?.includes('404') || e.message?.includes('not found') || e.message?.includes('Workspace not found')) {
        setCurrentId(null);
      }
    }
  }, [currentId]);

  const loadDashboard = useCallback(async () => {
    if (!currentId) return;
    try {
      const dash = await api.getDashboard();
      setActivityByWs((prev) => ({
        ...prev,
        [currentId]: dash.recentActivity as ActivityEvent[],
      }));
    } catch {}
  }, [currentId]);

  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (savedToken) setToken(savedToken);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p: Persisted = JSON.parse(raw);
        setCurrentId(p.currentId ?? null);
        setChatByWs(p.chatByWs ?? {});
        setChatByStack(p.chatByStack ?? {});
        setSnippetsByWs(p.snippetsByWs ?? {});
        setAlertsByWs(p.alertsByWs ?? {});
        setEnvFilesByWs(p.envFilesByWs ?? {});
        setYamlHistoryByStack(p.yamlHistoryByStack ?? {});
        setDensityState(p.density ?? "comfortable");
      }
    } catch {}
    loadWorkspaces();
  }, [loadWorkspaces]);

  const loadTree = useCallback(async () => {
    if (!currentId) return;
    const ws = workspaces.find((w) => w.id === currentId);
    if (!ws) return;
    try {
      const tree = await api.getFileTree(ws.rootFolder);
      if (tree) {
        setTreeByWs((prev) => ({ ...prev, [currentId]: tree }));
      }
    } catch {}
  }, [currentId, workspaces]);

  useEffect(() => {
    if (currentId) {
      loadStacks();
      loadDashboard();
      loadTree();
    }
  }, [currentId, loadStacks, loadDashboard, loadTree]);

  useEffect(() => {
    if (!hydrated) return;
    const p: Persisted = {
      currentId,
      chatByWs,
      chatByStack,
      snippetsByWs,
      alertsByWs,
      envFilesByWs,
      yamlHistoryByStack,
      density,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  }, [
    currentId, chatByWs, chatByStack, snippetsByWs, alertsByWs,
    envFilesByWs, yamlHistoryByStack, density, hydrated,
  ]);

  useEffect(() => {
    document.documentElement.dataset.density = density;
  }, [density]);

  const current = useMemo(
    () => workspaces.find((w) => w.id === currentId) ?? null,
    [workspaces, currentId],
  );

  const setCurrent = useCallback((id: string) => {
    setCurrentId(id);
  }, []);

  const setDensity = useCallback((d: Density) => setDensityState(d), []);

  const refresh = useCallback(async () => {
    await loadWorkspaces();
    await loadStacks();
    await loadDashboard();
    await loadTree();
  }, [loadWorkspaces, loadStacks, loadDashboard, loadTree]);

  const refreshStacks = useCallback(async () => {
    await loadStacks();
  }, [loadStacks]);

  const pushActivity = useCallback(
    (workspaceId: string, ev: Omit<ActivityEvent, "id" | "ts">) => {
      const id = uuid();
      const full: ActivityEvent = {
        ...ev,
        id,
        ts: new Date().toISOString(),
      };
      setActivityByWs((prev) => ({
        ...prev,
        [workspaceId]: [full, ...(prev[workspaceId] ?? [])].slice(0, 100),
      }));
    },
    [],
  );

  const addWorkspace = useCallback(
    async (name: string, opts?: { description?: string; color?: string; icon?: string; rootFolderPath?: string }) => {
      const w = await api.createWorkspace({
        name,
        description: opts?.description,
        color: opts?.color,
        icon: opts?.icon,
        rootFolderPath: opts?.rootFolderPath,
      });
      setWorkspaces((prev) => [...prev, w]);
      setCurrentId(w.id);
      return w;
    },
    [],
  );

  const updateWorkspace = useCallback(
    async (id: string, patch: { name?: string; description?: string; color?: string; icon?: string; rootFolderPath?: string }) => {
      const w = await api.updateWorkspace(id, patch);
      setWorkspaces((prev) => prev.map((x) => (x.id === id ? { ...x, ...w } : x)));
    },
    [],
  );

  const deleteWorkspace = useCallback(
    async (id: string, alsoDeleteFolder?: boolean) => {
      await api.deleteWorkspace(id, alsoDeleteFolder);
      setWorkspaces((prev) => prev.filter((w) => w.id !== id));
      const strip = <T,>(prev: Record<string, T>) => {
        const { [id]: _d, ...rest } = prev;
        return rest;
      };
      setStacksByWs(strip);
      setTreeByWs(strip);
      setChatByWs(strip);
      setActivityByWs(strip);
      setSnippetsByWs(strip);
      setAlertsByWs(strip);
      setEnvFilesByWs(strip);
      if (currentId === id) {
        const remaining = workspaces.filter((w) => w.id !== id);
        setCurrentId(remaining[0]?.id ?? null);
      }
    },
    [currentId, workspaces],
  );

  const addStack = useCallback((workspaceId: string, stack: Stack) => {
    setStacksByWs((prev) => ({
      ...prev,
      [workspaceId]: [...(prev[workspaceId] ?? []), stack],
    }));
  }, []);

  const updateStack = useCallback((workspaceId: string, stackId: string, patch: Partial<Stack>) => {
    setStacksByWs((prev) => ({
      ...prev,
      [workspaceId]: (prev[workspaceId] ?? []).map((s) =>
        s.id === stackId ? { ...s, ...patch } : s,
      ),
    }));
  }, []);

  const deleteStack = useCallback(
    async (workspaceId: string, stackId: string) => {
      const name = (stacksByWs[workspaceId] ?? []).find((s) => s.id === stackId)?.name;
      await api.deleteStack(stackId);
      setStacksByWs((prev) => ({
        ...prev,
        [workspaceId]: (prev[workspaceId] ?? []).filter((s) => s.id !== stackId),
      }));
      if (name) pushActivity(workspaceId, { kind: "delete", message: `stack removed: ${name}` });
    },
    [pushActivity, stacksByWs],
  );

  const applyStackYaml = useCallback((workspaceId: string, stackId: string) => {
    setStacksByWs((prev) => ({
      ...prev,
      [workspaceId]: (prev[workspaceId] ?? []).map((s) =>
        s.id === stackId ? { ...s, runningYaml: s.yaml } : s,
      ),
    }));
  }, []);

  const updateYamlFile = useCallback(
    (workspaceId: string, fileId: string, content: string) => {
      let targetPath = "";
      setTreeByWs((prev) => {
        const root = prev[workspaceId];
        if (!root) return prev;
        const clone: YamlFile = JSON.parse(JSON.stringify(root));
        const walk = (node: YamlFile): boolean => {
          if (node.id === fileId) {
            node.content = content;
            targetPath = node.path;
            return true;
          }
          if (node.children) for (const c of node.children) if (walk(c)) return true;
          return false;
        };
        walk(clone);
        return { ...prev, [workspaceId]: clone };
      });
      if (targetPath) {
        api.writeFile(targetPath, content).catch(() => loadTree());
      }
    },
    [loadTree],
  );

  const updateYamlEnv = useCallback(
    (workspaceId: string, fileId: string, env: EnvVar[]) => {
      let targetDir = "";
      setTreeByWs((prev) => {
        const root = prev[workspaceId];
        if (!root) return prev;
        const clone: YamlFile = JSON.parse(JSON.stringify(root));
        const walk = (node: YamlFile): boolean => {
          if (node.id === fileId) {
            node.env = env;
            targetDir = node.path.replace(/\/[^/]+$/, "");
            return true;
          }
          if (node.children) for (const c of node.children) if (walk(c)) return true;
          return false;
        };
        walk(clone);
        return { ...prev, [workspaceId]: clone };
      });
      if (targetDir) {
        const content = env.map(e => `${e.key}=${e.value}`).join("\n");
        api.writeFile(`${targetDir}/.env`, content).catch(() => loadTree());
      }
    },
    [loadTree],
  );

  const mutateTree = useCallback(
    (workspaceId: string, mutator: (root: YamlFile) => void) => {
      setTreeByWs((prev) => {
        const root = prev[workspaceId];
        if (!root) return prev;
        const clone: YamlFile = JSON.parse(JSON.stringify(root));
        mutator(clone);
        return { ...prev, [workspaceId]: clone };
      });
    },
    [],
  );

  const findNode = (root: YamlFile, id: string): YamlFile | null => {
    if (root.id === id) return root;
    for (const c of root.children ?? []) {
      const r = findNode(c, id);
      if (r) return r;
    }
    return null;
  };
  const findParent = (root: YamlFile, id: string): YamlFile | null => {
    for (const c of root.children ?? []) {
      if (c.id === id) return root;
      const r = findParent(c, id);
      if (r) return r;
    }
    return null;
  };

  const renameYamlNode = useCallback(
    (workspaceId: string, fileId: string, newName: string) => {
      let oldPath = "";
      mutateTree(workspaceId, (root) => {
        const node = findNode(root, fileId);
        if (!node) return;
        oldPath = node.path;
        node.name = newName;
        node.path = node.path.replace(/[^/]+$/, newName);
        if (node.children) {
          const fix = (n: YamlFile, parentPath: string) => {
            n.path = `${parentPath}/${n.name}`;
            n.children?.forEach((c) => fix(c, n.path));
          };
          node.children.forEach((c) => fix(c, node.path));
        }
      });
      if (oldPath) {
        api.renameNode(oldPath, newName).catch(() => loadTree());
      }
    },
    [mutateTree, loadTree],
  );

  const deleteYamlNode = useCallback(
    (workspaceId: string, fileId: string) => {
      let targetPath = "";
      mutateTree(workspaceId, (root) => {
        const node = findNode(root, fileId);
        if (node) targetPath = node.path;
        const parent = findParent(root, fileId);
        if (!parent || !parent.children) return;
        const idx = parent.children.findIndex((c) => c.id === fileId);
        if (idx >= 0) parent.children.splice(idx, 1);
      });
      if (targetPath) {
        api.deleteNode(targetPath).catch(() => loadTree());
      }
    },
    [mutateTree, loadTree],
  );

  const duplicateYamlNode = useCallback(
    (workspaceId: string, fileId: string): string | null => {
      let targetPath = "";
      let newId: string | null = null;
      mutateTree(workspaceId, (root) => {
        const parent = findParent(root, fileId);
        const node = findNode(root, fileId);
        if (!parent || !parent.children || !node) return;
        targetPath = node.path;
        const stamp = (n: YamlFile, parentPath: string, isRoot: boolean) => {
          const parts = n.name.split(".");
          if (parts.length > 1) {
            parts[parts.length - 2] += "-copy";
            n.name = parts.join(".");
          } else {
            n.name = `${n.name}-copy`;
          }
          n.id = uuid();
          n.path = `${parentPath}/${n.name}`;
          n.children?.forEach((c) => stamp(c, n.path, false));
        };
        const clone: YamlFile = JSON.parse(JSON.stringify(node));
        stamp(clone, parent.path, true);
        newId = clone.id;
        const idx = parent.children.findIndex((c) => c.id === fileId);
        parent.children.splice(idx + 1, 0, clone);
      });
      if (targetPath) {
        api.duplicateFile(targetPath).then(() => loadTree()).catch(() => loadTree());
      }
      return newId;
    },
    [mutateTree, loadTree],
  );

  const createYamlChild = useCallback(
    (workspaceId: string, parentId: string, name: string, isDir: boolean): string | null => {
      let targetParentPath = "";
      let newId: string | null = null;
      const content = isDir ? "" : `# ${name}\n`;
      mutateTree(workspaceId, (root) => {
        const parent = findNode(root, parentId);
        if (!parent || !parent.isDir) return;
        targetParentPath = parent.path;
        parent.children ??= [];
        const child: YamlFile = {
          id: uuid(),
          name,
          path: `${parent.path}/${name}`,
          isDir,
          content,
          children: isDir ? [] : undefined,
          env: isDir ? undefined : [],
        };
        newId = child.id;
        parent.children.push(child);
      });
      if (targetParentPath) {
        if (isDir) {
          api.createFolder(targetParentPath, name).catch(() => loadTree());
        } else {
          api.writeFile(`${targetParentPath}/${name}`, content).catch(() => loadTree());
        }
      }
      return newId;
    },
    [mutateTree, loadTree],
  );

  const appendChat = useCallback((workspaceId: string, msg: ChatMessage) => {
    setChatByWs((prev) => ({
      ...prev,
      [workspaceId]: [...(prev[workspaceId] ?? []), msg],
    }));
  }, []);

  const clearChat = useCallback((workspaceId: string) => {
    setChatByWs((prev) => ({ ...prev, [workspaceId]: [] }));
  }, []);

  const appendStackChat = useCallback((stackId: string, msg: ChatMessage) => {
    setChatByStack((prev) => ({
      ...prev,
      [stackId]: [...(prev[stackId] ?? []), msg],
    }));
  }, []);

  const clearStackChat = useCallback((stackId: string) => {
    setChatByStack((prev) => ({ ...prev, [stackId]: [] }));
  }, []);

  const addSnippet = useCallback((workspaceId: string, s: Snippet) => {
    setSnippetsByWs((prev) => ({
      ...prev,
      [workspaceId]: [s, ...(prev[workspaceId] ?? [])],
    }));
  }, []);
  const deleteSnippet = useCallback((workspaceId: string, id: string) => {
    setSnippetsByWs((prev) => ({
      ...prev,
      [workspaceId]: (prev[workspaceId] ?? []).filter((s) => s.id !== id),
    }));
  }, []);

  const addAlert = useCallback((workspaceId: string, a: AlertRule) => {
    setAlertsByWs((prev) => ({
      ...prev,
      [workspaceId]: [a, ...(prev[workspaceId] ?? [])],
    }));
  }, []);
  const updateAlert = useCallback(
    (workspaceId: string, id: string, patch: Partial<AlertRule>) => {
      setAlertsByWs((prev) => ({
        ...prev,
        [workspaceId]: (prev[workspaceId] ?? []).map((a) =>
          a.id === id ? { ...a, ...patch } : a,
        ),
      }));
    },
    [],
  );
  const deleteAlert = useCallback((workspaceId: string, id: string) => {
    setAlertsByWs((prev) => ({
      ...prev,
      [workspaceId]: (prev[workspaceId] ?? []).filter((a) => a.id !== id),
    }));
  }, []);

  const updateEnvFile = useCallback(
    (workspaceId: string, id: string, vars: EnvFileEntry["vars"]) => {
      setEnvFilesByWs((prev) => ({
        ...prev,
        [workspaceId]: (prev[workspaceId] ?? []).map((e) =>
          e.id === id ? { ...e, vars } : e,
        ),
      }));
    },
    [],
  );
  const addEnvFile = useCallback((workspaceId: string, e: EnvFileEntry) => {
    setEnvFilesByWs((prev) => ({
      ...prev,
      [workspaceId]: [e, ...(prev[workspaceId] ?? [])],
    }));
  }, []);

  const pushYamlVersion = useCallback((stackId: string, v: YamlVersion) => {
    setYamlHistoryByStack((prev) => ({
      ...prev,
      [stackId]: [v, ...(prev[stackId] ?? [])].slice(0, 50),
    }));
  }, []);

  const exportAll = useCallback((): string => {
    const p: Persisted = {
      currentId,
      chatByWs,
      chatByStack,
      snippetsByWs,
      alertsByWs,
      envFilesByWs,
      yamlHistoryByStack,
      density,
    };
    return JSON.stringify(p, null, 2);
  }, [
    currentId, chatByWs, chatByStack, snippetsByWs, alertsByWs,
    envFilesByWs, yamlHistoryByStack, density,
  ]);

  const importAll = useCallback((json: string): boolean => {
    try {
      const p: Persisted = JSON.parse(json);
      setCurrentId(p.currentId ?? null);
      setChatByWs(p.chatByWs ?? {});
      setChatByStack(p.chatByStack ?? {});
      setSnippetsByWs(p.snippetsByWs ?? {});
      setAlertsByWs(p.alertsByWs ?? {});
      setEnvFilesByWs(p.envFilesByWs ?? {});
      setYamlHistoryByStack(p.yamlHistoryByStack ?? {});
      setDensityState(p.density ?? "comfortable");
      return true;
    } catch {
      return false;
    }
  }, []);

  const value: WorkspaceStore = {
    workspaces, currentId, current, stacksByWs, treeByWs,
    chatByWs, chatByStack, activityByWs, snippetsByWs, alertsByWs,
    envFilesByWs, yamlHistoryByStack, density, hydrated, loading, error,
    setCurrent, setDensity, refresh, refreshStacks,
    addWorkspace, updateWorkspace, deleteWorkspace,
    addStack, updateStack, deleteStack, applyStackYaml,
    updateYamlFile, updateYamlEnv, renameYamlNode, deleteYamlNode,
    duplicateYamlNode, createYamlChild,
    appendChat, clearChat, appendStackChat, clearStackChat,
    pushActivity, addSnippet, deleteSnippet,
    addAlert, updateAlert, deleteAlert,
    updateEnvFile, addEnvFile, pushYamlVersion,
    exportAll, importAll,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWorkspaces() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWorkspaces must be used inside WorkspaceProvider");
  return ctx;
}
