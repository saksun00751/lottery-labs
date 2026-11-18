// PM2 process file. On the server:
//   npm ci && npm run build
//   pm2 start ecosystem.config.cjs   (first time)
//   pm2 reload ecosystem.config.cjs  (later deploys)
//   pm2 save
//
// `output: 'standalone'` means `next start` is unsupported, so run the wrapper
// that copies public/ and .next/static next to server.js and then starts it.
module.exports = {
  apps: [
    {
      name: 'lotto',
      script: 'scripts/start-standalone.mjs',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '700M',
      env: {
        NODE_ENV: 'production',
        PORT: 4801,
        HOSTNAME: '0.0.0.0',
      },
    },
  ],
};
