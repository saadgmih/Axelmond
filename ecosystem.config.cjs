// PM2 Ecosystem — Axelmond Research Labs
// Usage : pm2 start ecosystem.config.cjs [--env development]
// Prérequis : npm run build (génère dist/server.cjs)
//
// Cluster mode activates when REDIS_URL is set (shared cache across workers).
// Hostinger Node.js Web App manages its own process — do not run PM2 there.

const useCluster = Boolean(String(process.env.REDIS_URL || "").trim());
const configuredInstances = Number(process.env.PM2_INSTANCES);
const instances =
  useCluster && Number.isInteger(configuredInstances) && configuredInstances > 0
    ? configuredInstances
    : useCluster
      ? "max"
      : 1;

module.exports = {
  apps: [
    {
      name: "axelmond-research-labs",
      script: "./dist/server.cjs",
      instances,
      exec_mode: useCluster ? "cluster" : "fork",
      node_args: "--max-old-space-size=1024",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      env_development: {
        NODE_ENV: "development",
        PORT: 3000,
      },
      max_memory_restart: "1G",
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      exp_backoff_restart_delay: 100,
      max_restarts: 10,
      min_uptime: "5s",
      kill_timeout: 10000,
      listen_timeout: 5000,
      wait_ready: false,
    },
  ],
};
