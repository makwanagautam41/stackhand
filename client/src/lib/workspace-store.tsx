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
  Workspace,
  YamlFile,
  YamlVersion,
} from "./types";
import {
  buildFileTree,
  seedStacksFor,
  SEED_ALERTS,
  SEED_ENV_FILES,
  SEED_SNIPPETS,
} from "./mock-data";
import { logActivity as sqliteLogActivity } from "./sqlite";

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

  setCurrent: (id: string) => void;
  setDensity: (d: Density) => void;
  addWorkspace: (w: Workspace) => void;
  updateWorkspace: (id: string, patch: Partial<Workspace>) => void;
  deleteWorkspace: (id: string) => void;

  addStack: (workspaceId: string, stack: Stack) => void;
  updateStack: (workspaceId: string, stackId: string, patch: Partial<Stack>) => void;
  deleteStack: (workspaceId: string, stackId: string) => void;
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

interface Persisted {
  workspaces: Workspace[];
  currentId: string | null;
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

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p: Persisted = JSON.parse(raw);
        setWorkspaces(p.workspaces ?? []);
        setCurrentId(p.currentId ?? null);
        setStacksByWs(p.stacksByWs ?? {});
        setTreeByWs(p.treeByWs ?? {});
        setChatByWs(p.chatByWs ?? {});
        setChatByStack(p.chatByStack ?? {});
        setActivityByWs(p.activityByWs ?? {});
        setSnippetsByWs(p.snippetsByWs ?? {});
        setAlertsByWs(p.alertsByWs ?? {});
        setEnvFilesByWs(p.envFilesByWs ?? {});
        setYamlHistoryByStack(p.yamlHistoryByStack ?? {});
        setDensityState(p.density ?? "comfortable");
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const p: Persisted = {
      workspaces,
      currentId,
      stacksByWs,
      treeByWs,
      chatByWs,
      chatByStack,
      activityByWs,
      snippetsByWs,
      alertsByWs,
      envFilesByWs,
      yamlHistoryByStack,
      density,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  }, [
    workspaces,
    currentId,
    stacksByWs,
    treeByWs,
    chatByWs,
    chatByStack,
    activityByWs,
    snippetsByWs,
    alertsByWs,
    envFilesByWs,
    yamlHistoryByStack,
    density,
    hydrated,
  ]);

  // Apply density to html
  useEffect(() => {
    document.documentElement.dataset.density = density;
  }, [density]);

  const current = useMemo(
    () => workspaces.find((w) => w.id === currentId) ?? null,
    [workspaces, currentId],
  );

  const setCurrent = useCallback((id: string) => setCurrentId(id), []);
  const setDensity = useCallback((d: Density) => setDensityState(d), []);

  const pushActivity = useCallback(
    (workspaceId: string, ev: Omit<ActivityEvent, "id" | "ts">) => {
      const id = crypto.randomUUID();
      const now = Date.now();
      const full: ActivityEvent = {
        ...ev,
        id,
        ts: new Date(now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setActivityByWs((prev) => ({
        ...prev,
        [workspaceId]: [full, ...(prev[workspaceId] ?? [])].slice(0, 100),
      }));
      // Mirror to SQLite for durable log
      void sqliteLogActivity({
        id,
        workspaceId,
        kind: ev.kind,
        message: ev.message,
        ts: now,
      }).catch(() => {});
    },
    [],
  );

  const addWorkspace = useCallback(
    (w: Workspace) => {
      setWorkspaces((prev) => [...prev, w]);
      setCurrentId(w.id);
      setStacksByWs((prev) => ({
        ...prev,
        [w.id]: seedStacksFor(w.id, Object.keys(prev).length),
      }));
      setTreeByWs((prev) => ({ ...prev, [w.id]: buildFileTree(w.rootFolder) }));
      setSnippetsByWs((prev) => ({ ...prev, [w.id]: SEED_SNIPPETS.map((s) => ({ ...s })) }));
      setAlertsByWs((prev) => ({ ...prev, [w.id]: SEED_ALERTS.map((a) => ({ ...a })) }));
      setEnvFilesByWs((prev) => ({ ...prev, [w.id]: SEED_ENV_FILES.map((e) => ({ ...e })) }));
      pushActivity(w.id, { kind: "create", message: `workspace created: ${w.name}` });
    },
    [pushActivity],
  );

  const updateWorkspace = useCallback((id: string, patch: Partial<Workspace>) => {
    setWorkspaces((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)));
    if (patch.rootFolder) {
      setTreeByWs((prev) => ({ ...prev, [id]: buildFileTree(patch.rootFolder!) }));
    }
  }, []);

  const deleteWorkspace = useCallback(
    (id: string) => {
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

  const addStack = useCallback(
    (workspaceId: string, stack: Stack) => {
      setStacksByWs((prev) => ({
        ...prev,
        [workspaceId]: [...(prev[workspaceId] ?? []), stack],
      }));
      pushActivity(workspaceId, { kind: "create", message: `stack created: ${stack.name}` });
    },
    [pushActivity],
  );

  const updateStack = useCallback(
    (workspaceId: string, stackId: string, patch: Partial<Stack>) => {
      setStacksByWs((prev) => ({
        ...prev,
        [workspaceId]: (prev[workspaceId] ?? []).map((s) =>
          s.id === stackId ? { ...s, ...patch } : s,
        ),
      }));
    },
    [],
  );

  const applyStackYaml = useCallback((workspaceId: string, stackId: string) => {
    setStacksByWs((prev) => ({
      ...prev,
      [workspaceId]: (prev[workspaceId] ?? []).map((s) =>
        s.id === stackId ? { ...s, runningYaml: s.yaml } : s,
      ),
    }));
  }, []);

  const deleteStack = useCallback(
    (workspaceId: string, stackId: string) => {
      const name = (stacksByWs[workspaceId] ?? []).find((s) => s.id === stackId)?.name;
      setStacksByWs((prev) => ({
        ...prev,
        [workspaceId]: (prev[workspaceId] ?? []).filter((s) => s.id !== stackId),
      }));
      if (name) pushActivity(workspaceId, { kind: "delete", message: `stack removed: ${name}` });
    },
    [pushActivity, stacksByWs],
  );

  const updateYamlFile = useCallback(
    (workspaceId: string, fileId: string, content: string) => {
      setTreeByWs((prev) => {
        const root = prev[workspaceId];
        if (!root) return prev;
        const clone: YamlFile = JSON.parse(JSON.stringify(root));
        const walk = (node: YamlFile): boolean => {
          if (node.id === fileId) {
            node.content = content;
            return true;
          }
          if (node.children) for (const c of node.children) if (walk(c)) return true;
          return false;
        };
        walk(clone);
        return { ...prev, [workspaceId]: clone };
      });
    },
    [],
  );

  const updateYamlEnv = useCallback(
    (workspaceId: string, fileId: string, env: EnvVar[]) => {
      setTreeByWs((prev) => {
        const root = prev[workspaceId];
        if (!root) return prev;
        const clone: YamlFile = JSON.parse(JSON.stringify(root));
        const walk = (node: YamlFile): boolean => {
          if (node.id === fileId) {
            node.env = env;
            return true;
          }
          if (node.children) for (const c of node.children) if (walk(c)) return true;
          return false;
        };
        walk(clone);
        return { ...prev, [workspaceId]: clone };
      });
    },
    [],
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
      mutateTree(workspaceId, (root) => {
        const node = findNode(root, fileId);
        if (!node) return;
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
      pushActivity(workspaceId, { kind: "edit", message: `renamed to ${newName}` });
    },
    [mutateTree, pushActivity],
  );

  const deleteYamlNode = useCallback(
    (workspaceId: string, fileId: string) => {
      let removedName = "";
      mutateTree(workspaceId, (root) => {
        const parent = findParent(root, fileId);
        if (!parent || !parent.children) return;
        const idx = parent.children.findIndex((c) => c.id === fileId);
        if (idx >= 0) {
          removedName = parent.children[idx].name;
          parent.children.splice(idx, 1);
        }
      });
      if (removedName)
        pushActivity(workspaceId, { kind: "delete", message: `deleted ${removedName}` });
    },
    [mutateTree, pushActivity],
  );

  const duplicateYamlNode = useCallback(
    (workspaceId: string, fileId: string): string | null => {
      let newId: string | null = null;
      mutateTree(workspaceId, (root) => {
        const parent = findParent(root, fileId);
        const node = findNode(root, fileId);
        if (!parent || !parent.children || !node) return;
        const stamp = (n: YamlFile, parentPath: string, isRoot: boolean) => {
          n.id = crypto.randomUUID();
          if (isRoot) {
            const parts = n.name.split(".");
            if (parts.length > 1) {
              parts[parts.length - 2] += "-copy";
              n.name = parts.join(".");
            } else {
              n.name = `${n.name}-copy`;
            }
          }
          n.path = `${parentPath}/${n.name}`;
          n.children?.forEach((c) => stamp(c, n.path, false));
        };
        const clone: YamlFile = JSON.parse(JSON.stringify(node));
        stamp(clone, parent.path, true);
        newId = clone.id;
        const idx = parent.children.findIndex((c) => c.id === fileId);
        parent.children.splice(idx + 1, 0, clone);
      });
      if (newId)
        pushActivity(workspaceId, { kind: "create", message: `duplicated file` });
      return newId;
    },
    [mutateTree, pushActivity],
  );

  const createYamlChild = useCallback(
    (workspaceId: string, parentId: string, name: string, isDir: boolean): string | null => {
      let newId: string | null = null;
      mutateTree(workspaceId, (root) => {
        const parent = findNode(root, parentId);
        if (!parent) return;
        if (!parent.isDir) return;
        parent.children ??= [];
        const child: YamlFile = {
          id: crypto.randomUUID(),
          name,
          path: `${parent.path}/${name}`,
          isDir,
          content: isDir ? "" : `# ${name}\n`,
          children: isDir ? [] : undefined,
          env: isDir ? undefined : [],
        };
        newId = child.id;
        parent.children.push(child);
      });
      if (newId)
        pushActivity(workspaceId, {
          kind: "create",
          message: `created ${isDir ? "folder" : "file"}: ${name}`,
        });
      return newId;
    },
    [mutateTree, pushActivity],
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
      workspaces,
      currentId,
      stacksByWs,
      treeByWs,
      chatByWs,
      chatByStack,
      activityByWs,
      snippetsByWs,
      alertsByWs,
      envFilesByWs,
      yamlHistoryByStack,
      density,
    };
    return JSON.stringify(p, null, 2);
  }, [
    workspaces,
    currentId,
    stacksByWs,
    treeByWs,
    chatByWs,
    chatByStack,
    activityByWs,
    snippetsByWs,
    alertsByWs,
    envFilesByWs,
    yamlHistoryByStack,
    density,
  ]);

  const importAll = useCallback((json: string): boolean => {
    try {
      const p: Persisted = JSON.parse(json);
      setWorkspaces(p.workspaces ?? []);
      setCurrentId(p.currentId ?? null);
      setStacksByWs(p.stacksByWs ?? {});
      setTreeByWs(p.treeByWs ?? {});
      setChatByWs(p.chatByWs ?? {});
      setChatByStack(p.chatByStack ?? {});
      setActivityByWs(p.activityByWs ?? {});
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
    workspaces,
    currentId,
    current,
    stacksByWs,
    treeByWs,
    chatByWs,
    chatByStack,
    activityByWs,
    snippetsByWs,
    alertsByWs,
    envFilesByWs,
    yamlHistoryByStack,
    density,
    hydrated,
    setCurrent,
    setDensity,
    addWorkspace,
    updateWorkspace,
    deleteWorkspace,
    addStack,
    updateStack,
    applyStackYaml,
    deleteStack,
    updateYamlFile,
    updateYamlEnv,
    renameYamlNode,
    deleteYamlNode,
    duplicateYamlNode,
    createYamlChild,
    appendChat,
    clearChat,
    appendStackChat,
    clearStackChat,
    pushActivity,
    addSnippet,
    deleteSnippet,
    addAlert,
    updateAlert,
    deleteAlert,
    updateEnvFile,
    addEnvFile,
    pushYamlVersion,
    exportAll,
    importAll,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWorkspaces() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWorkspaces must be used inside WorkspaceProvider");
  return ctx;
}
