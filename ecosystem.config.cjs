const { resolve } = require('node:path')

module.exports = {
  apps: [{
    name: 'sele-sele',
    cwd: __dirname,
    script: resolve(__dirname, '.output/server/index.mjs'),
    interpreter: process.env.BUN_BIN || 'bun',
    // Collaboration rooms are coordinated inside a single application process.
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    autorestart: true,
    min_uptime: '10s',
    max_restarts: 10,
    exp_backoff_restart_delay: 1000,
    // Allow the shutdown hook to flush document state and close MySQL.
    kill_timeout: 30000,
    time: true,
    env: {
      NODE_ENV: 'production',
      HOST: process.env.HOST || '127.0.0.1',
      PORT: process.env.PORT || 8030
    }
  }]
}
