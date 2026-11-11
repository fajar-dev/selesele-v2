module.exports = {
  apps: [{
    name: 'sele-sele',
    script: './.output/server/index.mjs',
    interpreter: 'bun',
    instances: 1,
    exec_mode: 'fork',
    env: { PORT: 8030, NODE_ENV: 'production' }
  }]
}
