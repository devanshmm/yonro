import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createVercelRouting } from './hosting-config.js';

const routing = createVercelRouting(process.argv[2] || process.env.PUBLIC_API_ORIGIN || '');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Package only built public assets; never copy source secrets or local user data.
const html = await readFile(path.join(root, 'client/dist/index.html'), 'utf8');
if (!html.includes('/assets/')) {
  throw new Error('Build the client first with npm run build.');
}
const staging = path.join(root, 'work/vercel-site');
await mkdir(staging, { recursive: true });
await cp(path.join(root, 'client/dist'), staging, { recursive: true });

await writeFile(path.join(staging, 'vercel.json'), `${JSON.stringify(routing, null, 2)}\n`);
await writeFile(
  path.join(root, 'vercel.json'),
  `${JSON.stringify(
    {
      ...routing,
      framework: 'vite',
      installCommand: 'npm ci',
      buildCommand: 'npm run build -w client',
      outputDirectory: 'client/dist',
    },
    null,
    2,
  )}\n`,
);
console.log(`Frontend deployment package ready: ${staging}`);
