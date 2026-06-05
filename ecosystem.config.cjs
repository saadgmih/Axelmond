// PM2 Ecosystem — Axelmond Research Labs
// Usage : pm2 start ecosystem.config.cjs [--env development]
// Prérequis : npm run build (génère dist/server.cjs)

module.exports = {
  apps: [
    {
      name: "axelmond-research-labs",
      script: "./dist/server.cjs",
      instances: "max",        // cluster = nombre de cœurs CPU
      exec_mode: "cluster",
      node_args: "--max-old-space-size=1024",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      env_development: {
        NODE_ENV: "development",
        PORT: 3000,
      },
      // Redémarre automatiquement si le process dépasse 1 Go RAM
      max_memory_restart: "1G",
      // Logs
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      // Redémarrage exponentiel backoff si crash (évite les storm loops)
      exp_backoff_restart_delay: 100,
      max_restarts: 10,
      min_uptime: "5s",
      // Graceful shutdown : laisse les requêtes en cours se terminer
      kill_timeout: 10000,
      listen_timeout: 5000,
      // Healthcheck
      wait_ready: false,
    },
  ],
};
