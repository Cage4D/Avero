import { validateEnv } from './env.validation.js';
import { DEFAULT_PORT, NodeEnv } from '../enums/env.js';

const complete = {
  DATABASE_URL: 'postgresql://avero:avero@localhost:5432/avero',
  JWT_PRIVATE_KEY: 'private',
  JWT_PUBLIC_KEY: 'public',
};

describe('environment validation', () => {
  it('refuses to boot without the signing key', () => {
    expect(() => validateEnv({ ...complete, JWT_PRIVATE_KEY: undefined })).toThrow(
      /JWT_PRIVATE_KEY/,
    );
  });

  it('refuses to boot without the verifying key', () => {
    expect(() => validateEnv({ ...complete, JWT_PUBLIC_KEY: undefined })).toThrow(/JWT_PUBLIC_KEY/);
  });

  it('treats a blank key as absent rather than as a value', () => {
    expect(() => validateEnv({ ...complete, JWT_PRIVATE_KEY: '   ' })).toThrow(/JWT_PRIVATE_KEY/);
  });

  it('fills the defaults a local run can do without', () => {
    const parsed = validateEnv(complete);

    expect(parsed.PORT).toBe(DEFAULT_PORT);
    expect(parsed.CORS_ORIGINS).toEqual(['http://localhost:3000']);
    expect(parsed.NODE_ENV).toBe(NodeEnv.DEVELOPMENT);
  });

  it('keeps values the environment did supply', () => {
    const parsed = validateEnv({
      ...complete,
      PORT: '8080',
      NODE_ENV: 'production',
      CORS_ORIGINS: 'https://a.example, https://b.example',
    });

    expect(parsed.PORT).toBe(8080);
    expect(parsed.NODE_ENV).toBe(NodeEnv.PRODUCTION);
    expect(parsed.CORS_ORIGINS).toEqual(['https://a.example', 'https://b.example']);
  });

  it('rejects a CORS origin that is not a URL', () => {
    expect(() => validateEnv({ ...complete, CORS_ORIGINS: 'not-a-url' })).toThrow(/CORS_ORIGINS/);
  });
});
