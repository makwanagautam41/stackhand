export interface StackTemplate {
  id: string;
  name: string;
  description: string;
  yaml: string;
  params: {
    port?: number;
    volumePath?: string;
    envVars?: { key: string; value: string }[];
  };
}

export const STACK_TEMPLATES: StackTemplate[] = [
  {
    id: 'nginx',
    name: 'Nginx',
    description: 'Reverse proxy / static files',
    yaml: `version: "3.9"
services:
  {{name}}:
    image: nginx:alpine
    container_name: {{name}}
    ports:
      - "{{port}}:80"
    volumes:
      - ./html:/usr/share/nginx/html
    restart: unless-stopped`,
    params: { port: 80, volumePath: './html', envVars: [] },
  },
  {
    id: 'redis',
    name: 'Redis',
    description: 'In-memory data store',
    yaml: `version: "3.9"
services:
  {{name}}:
    image: redis:7-alpine
    container_name: {{name}}
    ports:
      - "{{port}}:6379"
    volumes:
      - redis-data:/data
    command: ["redis-server", "--appendonly", "yes"]
volumes:
  redis-data:`,
    params: { port: 6379, volumePath: 'redis-data', envVars: [] },
  },
  {
    id: 'postgres',
    name: 'Postgres',
    description: 'SQL database',
    yaml: `version: "3.9"
services:
  {{name}}:
    image: postgres:16
    container_name: {{name}}
    environment:
      POSTGRES_USER: {{POSTGRES_USER}}
      POSTGRES_PASSWORD: {{POSTGRES_PASSWORD}}
      POSTGRES_DB: {{POSTGRES_DB}}
    ports:
      - "{{port}}:5432"
    volumes:
      - pg-data:/var/lib/postgresql/data
volumes:
  pg-data:`,
    params: {
      port: 5432, volumePath: 'pg-data',
      envVars: [
        { key: 'POSTGRES_USER', value: 'admin' },
        { key: 'POSTGRES_PASSWORD', value: 'changeme' },
        { key: 'POSTGRES_DB', value: 'appdb' },
      ],
    },
  },
  {
    id: 'mysql',
    name: 'MySQL',
    description: 'SQL database',
    yaml: `version: "3.9"
services:
  {{name}}:
    image: mysql:8
    container_name: {{name}}
    environment:
      MYSQL_ROOT_PASSWORD: {{MYSQL_ROOT_PASSWORD}}
      MYSQL_DATABASE: {{MYSQL_DATABASE}}
    ports:
      - "{{port}}:3306"
    volumes:
      - mysql-data:/var/lib/mysql
volumes:
  mysql-data:`,
    params: {
      port: 3306, volumePath: 'mysql-data',
      envVars: [
        { key: 'MYSQL_ROOT_PASSWORD', value: 'changeme' },
        { key: 'MYSQL_DATABASE', value: 'appdb' },
      ],
    },
  },
  {
    id: 'mongo',
    name: 'MongoDB',
    description: 'Document database',
    yaml: `version: "3.9"
services:
  {{name}}:
    image: mongo:7
    container_name: {{name}}
    ports:
      - "{{port}}:27017"
    volumes:
      - mongo-data:/data/db
volumes:
  mongo-data:`,
    params: { port: 27017, volumePath: 'mongo-data', envVars: [] },
  },
  {
    id: 'blank',
    name: 'Custom (blank)',
    description: 'Empty compose file',
    yaml: `version: "3.9"
services:
  # add services here`,
    params: { port: 80, envVars: [] },
  },
];
