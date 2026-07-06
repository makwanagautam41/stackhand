export type ContainerStatus = "running" | "stopped" | "error" | "unknown";
export type StackStatus = "running" | "stopped" | "error" | "partial" | "unknown";
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
  cpuLimit: number;
  memLimit: number;
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
  runningYaml?: string;
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
  icon: string;
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
  target: string;
  condition: "restarts>3" | "cpu>80" | "mem>80" | "downtime>5m";
  window: string;
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

export interface BackendWorkspace {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  rootFolderPath: string;
  createdAt: string;
  updatedAt: string;
}

export interface BackendStack {
  id: string;
  name: string;
  folderPath: string;
  status: string;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
  services?: { name: string; image: string; ports: any; volumes: any; environment: any }[];
  yaml?: string;
  containers?: any[];
}

export interface BackendContainer {
  id: string;
  name: string;
  image: string;
  status: string;
  ports?: { host: number; container: number; protocol: string }[];
  created?: number;
  state?: string;
}

export interface BackendImage {
  id: string;
  tags: string[];
  created: number;
  size: number;
}

export interface DashboardData {
  totalStacks: number;
  runningStacks: number;
  stoppedStacks: number;
  errorStacks: number;
  totalContainers: number;
  runningContainers: number;
  diskUsage: number;
  recentActivity: ActivityEvent[];
}

export interface DockerStatus {
  running: boolean;
  version: string | null;
  containers: number;
  runningContainers: number;
  images: number;
  os: string | null;
  architecture: string | null;
}

export interface OllamaStatus {
  connected: boolean;
  error?: string;
}

export interface OllamaChatResponse {
  role: string;
  content: string;
}

export interface GenerateStackResponse {
  imageName?: string;
  composeYaml: string;
  explanation: string;
  image?: string;
}

export interface OllamaModelInfo {
  name: string;
  family: string;
  parameterSize: string;
  quantization: string;
  size: number;
  contextLength: number;
  modifiedAt: string;
  digest: string;
  license: string;
  supportsVision: boolean;
  supportsTools: boolean;
  supportsEmbedding: boolean;
}

export interface OllamaVersion {
  version: string | null;
  error?: string;
}

export interface OllamaChatOptions {
  temperature?: number;
  topP?: number;
  topK?: number;
  repeatPenalty?: number;
  seed?: number;
  maxTokens?: number;
}

export interface OllamaMetrics {
  promptEvalCount: number;
  evalCount: number;
  totalDuration: number;
  loadDuration: number;
  promptEvalDuration: number;
  evalDuration: number;
}

export interface OllamaFullChatResponse extends OllamaChatResponse {
  metrics?: OllamaMetrics;
}

export interface AiSession {
  id: string;
  name: string;
  model: string;
  options: string;
  createdAt: string;
  updatedAt: string;
  workspaceId: string;
  _count?: { messages: number };
  messages?: AiMessage[];
}

export interface AiMessage {
  id: string;
  role: string;
  content: string;
  createdAt: string;
  sessionId: string;
}

export interface WebSearchResult {
  title: string;
  snippet: string;
  url: string;
}

export interface SearchEngineStatus {
  configured: boolean;
  requests: number;
}

export interface SearchStatus {
  engines: Record<string, SearchEngineStatus>;
  totalRequests: number;
}

export interface SearchLog {
  id: string;
  query: string;
  engine: string;
  results: number;
  createdAt: string;
}
