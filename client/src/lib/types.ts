export type ContainerStatus = "running" | "stopped" | "error";
export type StackStatus = "running" | "stopped" | "error" | "partial";
export type Density = "comfortable" | "compact";

export interface OllamaModel {
  id: string;
  name: string;
  size: string;
  enabled: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  rootFolder: string;
  ollamaConnected: boolean;
  models: OllamaModel[];
  createdAt: string;
}

export interface EnvVar {
  key: string;
  value: string;
  secret?: boolean;
}

export interface PortMapping {
  host: number;
  container: number;
  protocol: "tcp" | "udp";
}

export interface Volume {
  host: string;
  container: string;
}

export interface HealthInfo {
  uptime: string;
  restartCount: number;
  lastExitCode: number;
  lastCheck: string;
  healthy: boolean;
}

export interface ResourceLimits {
  cpuLimit: number; // %
  memLimit: number; // MB
}

export interface Container {
  id: string;
  name: string;
  image: string;
  status: ContainerStatus;
  ports: PortMapping[];
  volumes: Volume[];
  env: EnvVar[];
  cpu: number;
  mem: number;
  networks?: string[];
  health?: HealthInfo;
  limits?: ResourceLimits;
}

export interface Stack {
  id: string;
  workspaceId: string;
  name: string;
  yamlPath: string;
  status: StackStatus;
  services: string[];
  containers: Container[];
  lastModified: string;
  yaml: string;
  runningYaml?: string; // for diff
}

export interface YamlFile {
  id: string;
  path: string;
  name: string;
  content: string;
  isDir: boolean;
  children?: YamlFile[];
  env?: EnvVar[];
}

export interface LogEntry {
  ts: string;
  level: "info" | "warn" | "error";
  source: string;
  message: string;
}

export interface ActivityEvent {
  id: string;
  ts: string;
  message: string;
  kind: "start" | "stop" | "create" | "delete" | "edit" | "error" | "alert";
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  yaml?: string;
  ts: string;
}

export interface StackTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string; // tabler key or emoji
  color: string;
  tags: string[];
  yaml: string;
}

export interface Snippet {
  id: string;
  name: string;
  description: string;
  tags: string[];
  yaml: string;
  createdAt: string;
}

export interface AlertRule {
  id: string;
  name: string;
  target: string; // container / stack name
  condition: "restarts>3" | "cpu>80" | "mem>80" | "downtime>5m";
  window: string; // "5m", "1h"
  enabled: boolean;
  lastTriggered?: string;
}

export interface EnvFileEntry {
  id: string;
  path: string;
  stackName?: string;
  vars: EnvVar[];
}

export interface YamlVersion {
  id: string;
  ts: string;
  message: string;
  content: string;
}

export interface RegistryImage {
  name: string;
  namespace: string;
  description: string;
  stars: number;
  pulls: string;
  official: boolean;
  tags: string[];
}
