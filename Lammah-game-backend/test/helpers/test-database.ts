import { Connection, createConnection } from 'mongoose';

export function requireSafeTestDatabaseUri(): string {
  const uri = process.env.TEST_MONGODB_URI ?? process.env.MONGODB_URI;
  if (!uri) throw new Error('TEST_MONGODB_URI is required');
  const database = new URL(uri).pathname.replace(/^\//, '').split('?')[0];
  if (!database.endsWith('_test')) {
    throw new Error(
      'Refusing test database access: database name must end in _test',
    );
  }
  return uri;
}

export async function connectTestDatabase(): Promise<Connection> {
  return createConnection(requireSafeTestDatabaseUri()).asPromise();
}

export async function resetTestDatabase(connection: Connection): Promise<void> {
  if (!connection.db) throw new Error('Test database is not connected');
  await connection.db.dropDatabase();
}
