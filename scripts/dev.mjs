import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const environment = { ...process.env };

// Next.js treats any DEBUG value as test mode. Some Windows installations set
// DEBUG globally, which can make App Router API handlers return 404 in dev.
delete environment.DEBUG;
delete environment.NEXT_TEST_MODE;
delete environment.__NEXT_TEST_MODE;

const nextCli = fileURLToPath(
  new URL('../node_modules/next/dist/bin/next', import.meta.url),
);
const child = spawn(process.execPath, [nextCli, 'dev'], {
  env: environment,
  stdio: 'inherit',
});

child.once('exit', (code) => process.exit(code ?? 1));
child.once('error', (error) => {
  console.error(error);
  process.exit(1);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => child.kill(signal));
}
