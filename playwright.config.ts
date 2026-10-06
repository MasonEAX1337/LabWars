import { defineConfig } from '@playwright/test';
const baseURL = process.env.BASE_URL ?? 'http://localhost:5173';
const proxyURL = process.env.PLAYWRIGHT_PROXY_URL ? new URL(process.env.PLAYWRIGHT_PROXY_URL) : null;
const proxy = proxyURL ? { server: proxyURL.origin, ...(proxyURL.username ? { username: decodeURIComponent(proxyURL.username), password: decodeURIComponent(proxyURL.password) } : {}) } : undefined;
export default defineConfig({
  testDir: './e2e', timeout: process.env.BASE_URL ? 180000 : 90000, workers: 1,
  use: { baseURL, ...(proxy ? { proxy } : {}), viewport: { width: 1440, height: 1000 }, ...(process.env.CHROMIUM_EXECUTABLE_PATH ? { launchOptions: { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox','--disable-dev-shm-usage'] } } : {}) },
  webServer: process.env.BASE_URL ? undefined : { command: 'npm run dev', url: 'http://localhost:5173/api/game?config=1', reuseExistingServer: !process.env.CI },
});
