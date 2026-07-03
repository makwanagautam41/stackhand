import type {
  ActivityEvent,
  AlertRule,
  Container,
  EnvFileEntry,
  OllamaModel,
  RegistryImage,
  Snippet,
  Stack,
  StackTemplate,
  Workspace,
  YamlFile,
} from "./types";

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

const nginxYaml = `version: "3.9"
services:
  nginx:
    image: nginx:alpine
    container_name: nginx-proxy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./conf.d:/etc/nginx/conf.d
      - ./certs:/etc/nginx/certs
    networks:
      - web
    restart: unless-stopped
networks:
  web:
`;

const redisYaml = `version: "3.9"
services:
  redis:
    image: redis:7-alpine
    container_name: redis-cache
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - backend
    command: ["redis-server", "--appendonly", "yes"]
volumes:
  redis-data:
networks:
  backend:
`;

const postgresYaml = `version: "3.9"
services:
  postgres:
    image: postgres:16
    container_name: postgres-db
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: changeme
      POSTGRES_DB: appdb
    ports:
      - "5432:5432"
    volumes:
      - pg-data:/var/lib/postgresql/data
    networks:
      - backend
volumes:
  pg-data:
networks:
  backend:
`;

const wordpressYaml = `version: "3.9"
services:
  wordpress:
    image: wordpress:latest
    ports:
      - "8080:80"
    environment:
      WORDPRESS_DB_HOST: db
      WORDPRESS_DB_USER: wp
      WORDPRESS_DB_PASSWORD: wp
      WORDPRESS_DB_NAME: wp
    depends_on:
      - db
    volumes:
      - wp-data:/var/www/html
  db:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: wp
      MYSQL_USER: wp
      MYSQL_PASSWORD: wp
    volumes:
      - db-data:/var/lib/mysql
volumes:
  wp-data:
  db-data:
`;

const traefikYaml = `version: "3.9"
services:
  traefik:
    image: traefik:v3.0
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
    ports:
      - "80:80"
      - "8080:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
`;

function mkContainer(
  name: string,
  image: string,
  status: Container["status"],
  host = 8080,
  cont = 80,
  networks: string[] = ["default"],
): Container {
  return {
    id: crypto.randomUUID(),
    name,
    image,
    status,
    ports: [{ host, container: cont, protocol: "tcp" }],
    volumes: [{ host: `./${name}/data`, container: "/var/lib/data" }],
    env: [
      { key: "NODE_ENV", value: "production" },
      { key: "API_KEY", value: "sk-live-abcdef1234567890", secret: true },
    ],
    cpu: Math.round(Math.random() * (status === "running" ? 60 : 5)),
    mem: Math.round(Math.random() * (status === "running" ? 70 : 5)),
    networks,
    health: {
      uptime: status === "running" ? `${Math.floor(Math.random() * 72) + 1}h` : "0m",
      restartCount: Math.floor(Math.random() * 4),
      lastExitCode: status === "error" ? 137 : 0,
      lastCheck: "12s ago",
      healthy: status === "running",
    },
    limits: { cpuLimit: 80, memLimit: 512 },
  };
}

function buildStacks(workspaceId: string, seed: number): Stack[] {
  const base: Array<Omit<Stack, "id" | "workspaceId" | "containers">> = [
    {
      name: "nginx-proxy",
      yamlPath: "/stacks/nginx/docker-compose.yml",
      status: "running",
      services: ["nginx"],
      lastModified: "2h ago",
      yaml: nginxYaml,
      runningYaml: nginxYaml,
    },
    {
      name: "redis-cache",
      yamlPath: "/stacks/redis/docker-compose.yml",
      status: seed % 2 === 0 ? "running" : "stopped",
      services: ["redis"],
      lastModified: "1d ago",
      yaml: redisYaml,
      runningYaml: redisYaml,
    },
    {
      name: "postgres-db",
      yamlPath: "/stacks/postgres/docker-compose.yml",
      status: seed === 2 ? "error" : "running",
      services: ["postgres"],
      lastModified: "5d ago",
      yaml: postgresYaml,
      runningYaml: postgresYaml,
    },
  ];
  return base.map((s, i) => ({
    ...s,
    id: crypto.randomUUID(),
    workspaceId,
    containers: [
      mkContainer(
        s.name,
        s.services[0],
        s.status === "error" ? "error" : s.status === "running" ? "running" : "stopped",
        8000 + i * 100 + Math.floor(Math.random() * 90),
        80,
        [s.name === "nginx-proxy" ? "web" : "backend"],
      ),
    ],
  }));
}

export function buildFileTree(workspaceRoot: string): YamlFile {
  return {
    id: "root",
    path: workspaceRoot,
    name: workspaceRoot.split("/").filter(Boolean).pop() || "root",
    isDir: true,
    content: "",
    children: [
      {
        id: "stacks",
        path: `${workspaceRoot}/stacks`,
        name: "stacks",
        isDir: true,
        content: "",
        children: [
          {
            id: "nginx",
            path: `${workspaceRoot}/stacks/nginx`,
            name: "nginx",
            isDir: true,
            content: "",
            children: [
              {
                id: "nginx-yml",
                path: `${workspaceRoot}/stacks/nginx/docker-compose.yml`,
                name: "docker-compose.yml",
                isDir: false,
                content: nginxYaml,
                env: [
                  { key: "NGINX_HOST", value: "localhost" },
                  { key: "NGINX_PORT", value: "8080" },
                ],
              },
            ],
          },
          {
            id: "redis",
            path: `${workspaceRoot}/stacks/redis`,
            name: "redis",
            isDir: true,
            content: "",
            children: [
              {
                id: "redis-yml",
                path: `${workspaceRoot}/stacks/redis/docker-compose.yml`,
                name: "docker-compose.yml",
                isDir: false,
                content: redisYaml,
                env: [
                  { key: "REDIS_PASSWORD", value: "changeme", secret: true },
                  { key: "REDIS_MAXMEMORY", value: "256mb" },
                ],
              },
            ],
          },
          {
            id: "postgres",
            path: `${workspaceRoot}/stacks/postgres`,
            name: "postgres",
            isDir: true,
            content: "",
            children: [
              {
                id: "pg-yml",
                path: `${workspaceRoot}/stacks/postgres/docker-compose.yml`,
                name: "docker-compose.yml",
                isDir: false,
                content: postgresYaml,
                env: [
                  { key: "POSTGRES_USER", value: "admin" },
                  { key: "POSTGRES_PASSWORD", value: "supersecret", secret: true },
                  { key: "POSTGRES_DB", value: "app" },
                ],
              },
            ],
          },
        ],
      },
      {
        id: "backups",
        path: `${workspaceRoot}/backups`,
        name: "backups",
        isDir: true,
        content: "",
        children: [],
      },
    ],
  };
}

export const MOCK_ACTIVITY: ActivityEvent[] = [
  { id: "1", ts: "just now", message: "nginx-proxy started", kind: "start" },
  { id: "2", ts: "5m ago", message: "redis-cache stopped", kind: "stop" },
  { id: "3", ts: "1h ago", message: "new stack created: postgres-db", kind: "create" },
  { id: "4", ts: "3h ago", message: "edited /stacks/nginx/docker-compose.yml", kind: "edit" },
  { id: "5", ts: "yesterday", message: "container 'mysql-old' removed", kind: "delete" },
];

export const MOCK_LOG_LINES = [
  "[INFO] Starting service...",
  "[INFO] Loading configuration from /etc/config.yml",
  "[INFO] Connected to database in 42ms",
  "[WARN] Deprecated option 'legacy_mode' ignored",
  "[INFO] Listening on 0.0.0.0:8080",
  "[INFO] Health check passed",
  "[INFO] Received request GET /api/health",
  "[INFO] Cache hit ratio: 94.2%",
  "[WARN] Slow query detected (312ms)",
  "[INFO] Request completed in 12ms",
  "[ERROR] Failed to reach upstream (retry 1/3)",
  "[INFO] Upstream recovered",
];

export const STARTER_TEMPLATES = [
  { id: "nginx", name: "Nginx", desc: "Reverse proxy / static files", yaml: nginxYaml },
  { id: "redis", name: "Redis", desc: "In-memory data store", yaml: redisYaml },
  { id: "postgres", name: "Postgres", desc: "SQL database", yaml: postgresYaml },
  {
    id: "mysql",
    name: "MySQL",
    desc: "SQL database",
    yaml: `version: "3.9"\nservices:\n  mysql:\n    image: mysql:8\n    environment:\n      MYSQL_ROOT_PASSWORD: changeme\n    ports:\n      - "3306:3306"\n`,
  },
  {
    id: "mongo",
    name: "MongoDB",
    desc: "Document database",
    yaml: `version: "3.9"\nservices:\n  mongo:\n    image: mongo:7\n    ports:\n      - "27017:27017"\n    volumes:\n      - mongo-data:/data/db\nvolumes:\n  mongo-data:\n`,
  },
  {
    id: "blank",
    name: "Custom (blank)",
    desc: "Empty compose file",
    yaml: `version: "3.9"\nservices:\n  # add services here\n`,
  },
];

export const STACK_TEMPLATES: StackTemplate[] = [
  {
    id: "t-nginx",
    name: "Nginx",
    category: "Web",
    description: "Reverse proxy and static file server (Alpine).",
    icon: "IconServer",
    color: "#10b981",
    tags: ["proxy", "http", "tls"],
    yaml: nginxYaml,
  },
  {
    id: "t-postgres",
    name: "Postgres",
    category: "Database",
    description: "PostgreSQL 16 with persistent volume.",
    icon: "IconDatabase",
    color: "#6366f1",
    tags: ["sql", "database"],
    yaml: postgresYaml,
  },
  {
    id: "t-redis",
    name: "Redis",
    category: "Cache",
    description: "Redis 7 with AOF persistence.",
    icon: "IconBolt",
    color: "#ef4444",
    tags: ["cache", "kv"],
    yaml: redisYaml,
  },
  {
    id: "t-wordpress",
    name: "WordPress",
    category: "CMS",
    description: "WordPress + MySQL 8 bundled.",
    icon: "IconBrandWordpress",
    color: "#06b6d4",
    tags: ["cms", "php"],
    yaml: wordpressYaml,
  },
  {
    id: "t-traefik",
    name: "Traefik",
    category: "Networking",
    description: "Modern reverse proxy with Docker provider.",
    icon: "IconRoute",
    color: "#f59e0b",
    tags: ["proxy", "ingress"],
    yaml: traefikYaml,
  },
  {
    id: "t-mongo",
    name: "MongoDB",
    category: "Database",
    description: "Document database with persistent volume.",
    icon: "IconLeaf",
    color: "#14b8a6",
    tags: ["nosql", "database"],
    yaml: `version: "3.9"\nservices:\n  mongo:\n    image: mongo:7\n    ports:\n      - "27017:27017"\n    volumes:\n      - mongo-data:/data/db\nvolumes:\n  mongo-data:\n`,
  },
];

export const SEED_SNIPPETS: Snippet[] = [
  {
    id: "s1",
    name: "Healthcheck (http)",
    description: "Basic HTTP healthcheck fragment",
    tags: ["health"],
    yaml: `healthcheck:\n  test: ["CMD", "curl", "-f", "http://localhost/"]\n  interval: 30s\n  timeout: 5s\n  retries: 3`,
    createdAt: new Date().toISOString(),
  },
  {
    id: "s2",
    name: "Restart policy",
    description: "Unless-stopped restart",
    tags: ["policy"],
    yaml: `restart: unless-stopped`,
    createdAt: new Date().toISOString(),
  },
  {
    id: "s3",
    name: "Logging (json-file rotation)",
    description: "Bounded log driver",
    tags: ["logging"],
    yaml: `logging:\n  driver: json-file\n  options:\n    max-size: "10m"\n    max-file: "3"`,
    createdAt: new Date().toISOString(),
  },
];

export const SEED_ALERTS: AlertRule[] = [
  {
    id: "a1",
    name: "Restart storm",
    target: "nginx-proxy",
    condition: "restarts>3",
    window: "5m",
    enabled: true,
    lastTriggered: "2d ago",
  },
  {
    id: "a2",
    name: "High CPU",
    target: "postgres-db",
    condition: "cpu>80",
    window: "10m",
    enabled: true,
  },
  {
    id: "a3",
    name: "Memory pressure",
    target: "redis-cache",
    condition: "mem>80",
    window: "15m",
    enabled: false,
  },
];

export const SEED_ENV_FILES: EnvFileEntry[] = [
  {
    id: "e1",
    path: ".env",
    stackName: "postgres-db",
    vars: [
      { key: "POSTGRES_USER", value: "admin" },
      { key: "POSTGRES_PASSWORD", value: "s3cret-p@ss", secret: true },
      { key: "POSTGRES_DB", value: "appdb" },
    ],
  },
  {
    id: "e2",
    path: ".env",
    stackName: "nginx-proxy",
    vars: [
      { key: "DOMAIN", value: "example.com" },
      { key: "TLS_EMAIL", value: "admin@example.com" },
    ],
  },
];

export const MOCK_REGISTRY: RegistryImage[] = [
  {
    name: "nginx",
    namespace: "library",
    description: "Official build of Nginx.",
    stars: 19243,
    pulls: "10B+",
    official: true,
    tags: ["latest", "alpine", "1.27", "1.26", "stable"],
  },
  {
    name: "postgres",
    namespace: "library",
    description: "The PostgreSQL object-relational database system.",
    stars: 13102,
    pulls: "5B+",
    official: true,
    tags: ["16", "15", "14", "alpine"],
  },
  {
    name: "redis",
    namespace: "library",
    description: "Redis is an open source key-value store.",
    stars: 12432,
    pulls: "5B+",
    official: true,
    tags: ["7", "7-alpine", "6", "latest"],
  },
  {
    name: "mongo",
    namespace: "library",
    description: "MongoDB document database.",
    stars: 9821,
    pulls: "1B+",
    official: true,
    tags: ["7", "6", "latest"],
  },
  {
    name: "wordpress",
    namespace: "library",
    description: "The WordPress rich content management system.",
    stars: 5312,
    pulls: "1B+",
    official: true,
    tags: ["latest", "php8.3", "cli"],
  },
  {
    name: "traefik",
    namespace: "library",
    description: "Modern HTTP reverse proxy and load balancer.",
    stars: 3891,
    pulls: "1B+",
    official: true,
    tags: ["v3.0", "v2.11", "latest"],
  },
  {
    name: "minio",
    namespace: "minio",
    description: "High-performance object storage.",
    stars: 891,
    pulls: "500M+",
    official: false,
    tags: ["latest", "RELEASE.2024-01-01"],
  },
  {
    name: "grafana",
    namespace: "grafana",
    description: "The open observability platform.",
    stars: 2891,
    pulls: "1B+",
    official: false,
    tags: ["latest", "10.4.0", "11.0.0"],
  },
];

// Metrics history — 7 days hourly
export function generateMetricsHistory(hours = 168) {
  const now = Date.now();
  const arr: { ts: number; cpu: number; mem: number; net: number }[] = [];
  for (let i = hours; i >= 0; i--) {
    const t = now - i * 3600_000;
    const hour = new Date(t).getHours();
    const day = new Date(t).getDay();
    const dayCycle = 30 + Math.sin((hour / 24) * Math.PI * 2) * 25;
    const weekCycle = day === 0 || day === 6 ? -10 : 5;
    arr.push({
      ts: t,
      cpu: Math.max(5, Math.min(95, dayCycle + weekCycle + (Math.random() - 0.5) * 15)),
      mem: Math.max(10, Math.min(95, 40 + dayCycle * 0.6 + (Math.random() - 0.5) * 10)),
      net: Math.max(0, dayCycle + Math.random() * 20),
    });
  }
  return arr;
}

// Sample workspace for onboarding "try it"
export function buildSampleWorkspace(): Workspace {
  return {
    id: crypto.randomUUID(),
    name: "sample-lab",
    description: "Prefilled demo workspace",
    color: "#8b5cf6",
    icon: "FlaskConical",
    rootFolder: "/home/user/sample-lab",
    ollamaConnected: true,
    models: DEFAULT_MODELS.map((m) => ({ ...m })),
    createdAt: new Date().toISOString(),
  };
}

export function seedWorkspaces(): Workspace[] {
  const w1: Workspace = {
    id: crypto.randomUUID(),
    name: "Home Lab",
    description: "Personal self-hosted services",
    color: "#6366f1",
    icon: "Server",
    rootFolder: "/home/user/homelab",
    ollamaConnected: true,
    models: DEFAULT_MODELS.map((m) => ({ ...m })),
    createdAt: new Date().toISOString(),
  };
  const w2: Workspace = {
    id: crypto.randomUUID(),
    name: "Client Projects",
    description: "Production stacks for clients",
    color: "#10b981",
    icon: "Boxes",
    rootFolder: "/home/user/clients",
    ollamaConnected: true,
    models: DEFAULT_MODELS.map((m) => ({ ...m, enabled: m.id === "llama" })),
    createdAt: new Date().toISOString(),
  };
  const w3: Workspace = {
    id: crypto.randomUUID(),
    name: "Testing Sandbox",
    description: "Experiments and throwaway stacks",
    color: "#f59e0b",
    icon: "FlaskConical",
    rootFolder: "/home/user/sandbox",
    ollamaConnected: false,
    models: [],
    createdAt: new Date().toISOString(),
  };
  return [w1, w2, w3];
}

export function seedStacksFor(workspaceId: string, index: number): Stack[] {
  return buildStacks(workspaceId, index);
}

// Fake folder browser tree
export interface FakeFolder {
  path: string;
  name: string;
  children: FakeFolder[];
}

export const FAKE_FS: FakeFolder = {
  path: "/",
  name: "/",
  children: [
    {
      path: "/home",
      name: "home",
      children: [
        {
          path: "/home/user",
          name: "user",
          children: [
            { path: "/home/user/homelab", name: "homelab", children: [] },
            { path: "/home/user/clients", name: "clients", children: [] },
            { path: "/home/user/sandbox", name: "sandbox", children: [] },
            { path: "/home/user/projects", name: "projects", children: [] },
            { path: "/home/user/docker", name: "docker", children: [] },
          ],
        },
      ],
    },
    {
      path: "/opt",
      name: "opt",
      children: [
        { path: "/opt/stacks", name: "stacks", children: [] },
        { path: "/opt/data", name: "data", children: [] },
      ],
    },
    { path: "/var", name: "var", children: [{ path: "/var/lib", name: "lib", children: [] }] },
    { path: "/srv", name: "srv", children: [] },
  ],
};

export function findFolder(root: FakeFolder, path: string): FakeFolder | null {
  if (root.path === path) return root;
  for (const c of root.children) {
    const found = findFolder(c, path);
    if (found) return found;
  }
  return null;
}
