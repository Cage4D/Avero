import { generateKeyPairSync } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { API_PREFIX, configureApp } from '../src/setup.js';

// CI has no JWT keys. Use a throwaway pair; the health route never signs.
const encode = (pem: string) => Buffer.from(pem, 'utf8').toString('base64');
if (!process.env.JWT_PRIVATE_KEY || !process.env.JWT_PUBLIC_KEY) {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  process.env.JWT_PRIVATE_KEY = encode(privateKey);
  process.env.JWT_PUBLIC_KEY = encode(publicKey);
}
// Prisma connects lazily, so the health route never needs a reachable database.
process.env.DATABASE_URL ??= 'postgresql://avero:avero@localhost:5432/avero';

describe(`GET /${API_PREFIX}/health`, () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Imported after the env is set: ConfigModule validates it at import time.
    const { AppModule } = await import('../src/app.module.js');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns ok inside the response envelope', async () => {
    const res = await request(app.getHttpServer()).get(`/${API_PREFIX}/health`).expect(200);

    expect(res.body).toMatchObject({ statusCode: 200, message: 'Success', data: { status: 'ok' } });
  });
});
