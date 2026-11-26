import { finish, migrator } from './migrator';

migrator.migrateDown().then(({ error, results }) => finish(error, results, 'Reverted'));
