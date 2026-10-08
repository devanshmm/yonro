import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createVercelRouting } from '../../scripts/hosting-config.js';

function configuration(environment) {
  const moduleURL = new URL('../src/lib/config.js', import.meta.url).href;
  return JSON.parse(
    execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `import { config } from ${JSON.stringify(moduleURL)}; console.log(JSON.stringify({ host: config.HOST, proxy: config.TRUST_PROXY_HOPS }));`,
      ],
      {
        env: {
          PATH: process.env.PATH,
          DATABASE_URL: 'postgresql://test:test@example.invalid/test',
          JWT_SECRET: 'deployment-test-only-secret-32-characters',
          ...environment,
        },
        encoding: 'utf8',
      },
    ),
  );
}

test('production binds to all interfaces with bounded proxy trust; local development stays loopback', () => {
  assert.deepEqual(configuration({ NODE_ENV: 'production' }), { host: '0.0.0.0', proxy: 1 });
  assert.deepEqual(configuration({ NODE_ENV: 'development' }), { host: '127.0.0.1', proxy: 0 });
  assert.deepEqual(configuration({ NODE_ENV: 'production', TRUST_PROXY_HOPS: '0' }), {
    host: '0.0.0.0',
    proxy: 0,
  });
});

test('Vercel keeps authenticated API routing separate from SPA deep links and disables API caching', () => {
  const config = createVercelRouting('https://test-backend.onrender.com');
  assert.equal(config.rewrites[0].source, '/api/:path*');
  assert.equal(config.rewrites[0].destination, 'https://test-backend.onrender.com/api/:path*');
  const fallback = new RegExp(`^${config.rewrites[1].source}$`);
  for (const path of ['/login', '/habits/abc', '/gamification'])
    assert.equal(fallback.test(path), true);
  for (const path of ['/api', '/api/auth/me', '/api/tasks'])
    assert.equal(fallback.test(path), false);
  assert.equal(config.headers[0].headers[0].value, 'private, no-store');
});

test('deployment routing rejects insecure, credential-bearing and local backend targets', () => {
  for (const origin of [
    'http://backend.example.com',
    'https://user:secret@backend.example.com',
    'https://backend.example.com/api',
    'https://backend.example.com/?token=secret',
    'https://localhost',
    'https://server.local',
    'https://127.0.0.1',
    'https://[::1]',
  ])
    assert.throws(() => createVercelRouting(origin));
});
