import { app } from './app.js';
import { config } from './lib/config.js';
import { prisma } from './lib/prisma.js';
await prisma.$connect();
const server = app.listen(config.PORT, config.HOST, () =>
  console.log(`LOCKIN API listening on http://${config.HOST}:${config.PORT}`),
);
async function shutdown() {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
