// Isolated local verification server; never inherits a production database.
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
const env = {...process.env, DATABASE_URL:'postgresql://b1_test@127.0.0.1:55439/b1_release', MARKET_MODE:'demo', AUTH_URL:'http://127.0.0.1:3101', AUTH_SECRET:randomBytes(32).toString('hex')};
delete env.DEBUG;
spawn(process.execPath,['node_modules/next/dist/bin/next','start','--port','3101'],{env,stdio:'inherit'}).on('exit',code=>process.exit(code??1));
