import { cpSync, existsSync, mkdirSync, rmSync, renameSync } from 'node:fs';
import { join } from 'node:path';

// ChatGPT Sites starts Node applications from dist/server/index.js. Keep this
// adapter isolated from the application so normal Next.js development is unchanged.
const standalone = join('.next', 'standalone');
const target = join('dist', 'server');

if (!existsSync(standalone)) {
  throw new Error('Next standalone output was not created.');
}

rmSync('dist', { force: true, recursive: true });
mkdirSync(target, { recursive: true });
cpSync(standalone, target, { recursive: true, dereference: true });
cpSync(join('.next', 'static'), join(target, '.next', 'static'), { recursive: true });
rmSync(join(target, '.next', 'node_modules'), { force: true, recursive: true });
// The private ChatGPT preview runs with MARKET_MODE=demo. Prisma is intentionally
// excluded there to fit the Worker limit; the production Node deployment retains it.
rmSync(join(target, 'node_modules', '.prisma'), { force: true, recursive: true });
rmSync(join(target, 'node_modules', '@prisma'), { force: true, recursive: true });

if (existsSync('public')) {
  cpSync('public', join(target, 'public'), { recursive: true });
}

renameSync(join(target, 'server.js'), join(target, 'index.js'));
