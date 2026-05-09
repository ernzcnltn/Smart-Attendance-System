module.exports = {
  apps: [
    {
      name: 'smart-attendance-api',
      script: './src/server.js',
      instances: '4',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production'
      },
      max_memory_restart: '500M'
    }
  ]
};