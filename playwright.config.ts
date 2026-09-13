import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir:'./e2e', fullyParallel:true,
  use:{ baseURL:'http://127.0.0.1:3000', trace:'retain-on-failure', channel:process.platform === 'win32' ? 'msedge' : undefined },
  projects:[{name:'desktop',use:{...devices['Desktop Chrome']}},{name:'mobile',use:{...devices['iPhone 13'],defaultBrowserType:'chromium'}}],
  webServer:{ command:'npm run dev -- --hostname 127.0.0.1', url:'http://127.0.0.1:3000', reuseExistingServer:!process.env.CI, env:{MARKET_MODE:'demo'}, timeout:120000 },
});
