import 'dotenv/config';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Migrator, FileMigrationProvider } from 'kysely';
import { db } from '../services/database.service';

async function main() {
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: __dirname,
      import: (modulePath) => import(pathToFileURL(modulePath).href),
    }),
  });

  const { error, results } = await migrator.migrateToLatest();

  let anySucceeded = false;
  results?.forEach((r) => {
    if (r.status === 'Success') {
      console.log(`✓ Applied: ${r.migrationName}`);
      anySucceeded = true;
    } else if (r.status === 'Error') {
      console.error(`✗ Error:   ${r.migrationName}`);
    }
  });

  if (anySucceeded) {
    process.exit(0);
  }

  if (error) {
    console.error(error);
    process.exit(1);
  }

  console.log('No pending migrations.');
  process.exit(0);
}

main();
