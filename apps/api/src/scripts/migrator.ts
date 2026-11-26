import 'dotenv/config';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { FileMigrationProvider, Migrator } from 'kysely/migration';
import { db } from '../services/database.service';

// The runners live in src/scripts, NOT in src/migrations: FileMigrationProvider
// imports every .ts file in its folder, so a runner kept beside the migrations
// would be imported (and run) as if it were one. Only YYYYMMDD[_x]_name.ts files
// are migrations.
const MIGRATIONS = path.resolve(__dirname, '../migrations');

export const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
        fs,
        path,
        migrationFolder: MIGRATIONS,
        import: (modulePath) => import(pathToFileURL(modulePath).href),
    }),
});

// process.exit is deliberate: the mysql2 pool keeps Node alive otherwise.
export async function finish(error: unknown, results: { status: string; migrationName: string }[] | undefined, verb: string) {
    results?.forEach((r) => {
        if (r.status === 'Success') console.log(`✓ ${verb}: ${r.migrationName}`);
        else if (r.status === 'Error') console.error(`✗ Error: ${r.migrationName}`);
    });
    if (error) {
        console.error(error);
        process.exit(1);
    }
    if (!results?.length) console.log('Nothing to do.');
    process.exit(0);
}
