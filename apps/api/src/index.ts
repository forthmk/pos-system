import 'dotenv/config';
import { buildApp } from './app';
import { checkDatabaseConnection } from './services/database.service';

const PORT = Number(process.env.PORT ?? 3000);

async function start() {
  const app = await buildApp();

  try {
    await checkDatabaseConnection();
    app.log.info('[DB] Connected');
  } catch (err) {
    app.log.error('[DB] Could not connect — check MYSQL_* env vars');
    app.log.error(err);
    process.exit(1);
  }

  await app.listen({ port: PORT, host: '0.0.0.0' });
}

start();
