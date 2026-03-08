module.exports = {
  apps: [
    {
      name: 'loki-office',
      script: 'src/server.ts',
      interpreter: '/home/paji/.bun/bin/bun',
      watch: ['src'],
      watch_delay: 500,
      ignore_watch: ['node_modules', 'dist-office', 'office'],
      env: {
        MAW_HOST: 'local',
        MAW_PORT: '3456',
      },
    },
    {
      name: 'loki-office-dev',
      script: 'node_modules/.bin/vite',
      args: '--host',
      cwd: './office',
      interpreter: '/home/paji/.bun/bin/bun',
      env: {
        NODE_ENV: 'development',
      },
      // Only start manually: pm2 start ecosystem.config.cjs --only loki-office-dev
      autorestart: false,
    },
  ],
};
