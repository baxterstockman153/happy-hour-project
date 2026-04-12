// NOTE: This file is kept for reference only.
// The app is now deployed via Railway using src/server.ts.
// See Railway dashboard: https://railway.app

import serverlessExpress from '@vendia/serverless-express';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import app from './app';
import { up, down } from './db/migrate';
import { query, closePool } from './db/connection';
import bcrypt from 'bcryptjs';

const serverlessExpressHandler = serverlessExpress({ app });

let secretsLoaded = false;

async function loadSecrets(): Promise<void> {
  if (secretsLoaded) return;
  const arn = process.env.JWT_SECRET_ARN;
  if (arn && !process.env.JWT_SECRET) {
    const client = new SecretsManagerClient({});
    const resp = await client.send(new GetSecretValueCommand({ SecretId: arn }));
    process.env.JWT_SECRET = resp.SecretString ?? '';
  }
  secretsLoaded = true;
}

export const handler = async (event: any, context: any, callback: any) => {
  await loadSecrets();
  if (event.migrate === 'up' || event.migrate === 'down') {
    try {
      console.log(`Running migration: ${event.migrate}`);
      if (event.migrate === 'up') {
        await up();
      } else {
        await down();
      }
      await closePool();
      return { statusCode: 200, body: `Migration ${event.migrate} completed.` };
    } catch (err) {
      await closePool();
      console.error('Migration failed:', err);
      return { statusCode: 500, body: `Migration failed: ${err}` };
    }
  }

  if (event.createAdmin) {
    try {
      const { email, password, role = 'super_admin' } = event.createAdmin;
      if (!email || !password) {
        return { statusCode: 400, body: 'email and password are required' };
      }
      const passwordHash = await bcrypt.hash(password, 12);
      await query(
        `INSERT INTO admin_users (email, password_hash, role)
         VALUES ($1, $2, $3)
         ON CONFLICT (email) DO UPDATE SET password_hash = $2, role = $3`,
        [email, passwordHash, role]
      );
      return { statusCode: 200, body: `Admin user ${email} created/updated.` };
    } catch (err) {
      console.error('createAdmin failed:', err);
      return { statusCode: 500, body: `createAdmin failed: ${err}` };
    }
  }

  return serverlessExpressHandler(event, context, callback);
};
