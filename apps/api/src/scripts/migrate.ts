import { finish, migrator } from './migrator';

migrator.migrateToLatest().then(({ error, results }) => finish(error, results, 'Applied'));
