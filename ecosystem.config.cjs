// PM2 process file. On the server:
//   npm ci && npm run build
//   pm2 start ecosystem.config.cjs   (first time)
//   pm2 reload ecosystem.config.cjs  (later deploys)
//   pm2 save
module.exports = {
  apps: [
    {
      name: 'lotto',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 4801 -H 127.0.0.1',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '700M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
