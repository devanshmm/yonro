import { app } from './app.js';
import { config } from './lib/config.js';
import { prisma } from './lib/prisma.js';
await prisma.$connect();
const server = app.listen(config.PORT, '127.0.0.1', () =>
  console.log(`LOCKIN API listening on http://127.0.0.1:${config.PORT}`),
);
async function shutdown() {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
