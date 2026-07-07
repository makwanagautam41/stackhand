module.exports = {
  apps: [
    {
      name: 'stackhand-api',
      script: 'dist/src/main.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '500M',
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '30s',
      kill_timeout: 10000,
      listen_timeout: 8000,
      log_file: 'stackhand-api.log',
      error_file: 'stackhand-api.log',
      merge_logs: true,
      autorestart: true,
      watch: false,
    },
  ],
};
