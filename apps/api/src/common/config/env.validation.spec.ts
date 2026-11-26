import { validateEnv } from './env.validation';
import { DEFAULT_FRONTEND_URL, DEFAULT_PORT, NodeEnv } from '@common/enums/env';
import {
    DEFAULT_ADMIN_PORT,
    DEFAULT_SERVICE_NAME,
} from '@common/enums/observability';
import { DEFAULT_THROTTLE_LIMIT } from '@common/enums/cache';

const complete = {
    DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/app',
    JWT_PRIVATE_KEY: 'private',
    JWT_PUBLIC_KEY: 'public',
};

describe('environment validation', () => {
    it('refuses to boot without the signing key', () => {
        expect(() =>
            validateEnv({ ...complete, JWT_PRIVATE_KEY: undefined }),
        ).toThrow(/JWT_PRIVATE_KEY/);
    });

    it('refuses to boot without the verifying key', () => {
        expect(() =>
            validateEnv({ ...complete, JWT_PUBLIC_KEY: undefined }),
        ).toThrow(/JWT_PUBLIC_KEY/);
    });

    it('treats a blank key as absent rather than as a value', () => {
        expect(() =>
            validateEnv({ ...complete, JWT_PRIVATE_KEY: '   ' }),
        ).toThrow(/JWT_PRIVATE_KEY/);
    });

    it('fills the defaults a local run can do without', () => {
        const parsed = validateEnv(complete);

        expect(parsed.PORT).toBe(DEFAULT_PORT);
        expect(parsed.ADMIN_PORT).toBe(DEFAULT_ADMIN_PORT);
        expect(parsed.FRONTEND_URL).toBe(DEFAULT_FRONTEND_URL);
        expect(parsed.NODE_ENV).toBe(NodeEnv.DEVELOPMENT);
        expect(parsed.REDIS_URL).toBeUndefined();
        expect(parsed.THROTTLE_LIMIT).toBe(DEFAULT_THROTTLE_LIMIT);
        expect(parsed.OTEL_SERVICE_NAME).toBe(DEFAULT_SERVICE_NAME);
        expect(parsed.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT).toBeUndefined();
    });

    it('keeps values the environment did supply', () => {
        const parsed = validateEnv({
            ...complete,
            PORT: '8080',
            ADMIN_PORT: '9090',
            NODE_ENV: 'production',
            REDIS_URL: 'redis://localhost:6379',
            THROTTLE_LIMIT: '250',
            OTEL_SERVICE_NAME: 'custom-api',
            OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: 'http://jaeger:4318/v1/traces',
        });

        expect(parsed.PORT).toBe(8080);
        expect(parsed.ADMIN_PORT).toBe(9090);
        expect(parsed.NODE_ENV).toBe(NodeEnv.PRODUCTION);
        expect(parsed.REDIS_URL).toBe('redis://localhost:6379');
        expect(parsed.THROTTLE_LIMIT).toBe(250);
        expect(parsed.OTEL_SERVICE_NAME).toBe('custom-api');
        expect(parsed.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT).toBe(
            'http://jaeger:4318/v1/traces',
        );
    });

    it('rejects a frontend URL that is not a URL', () => {
        expect(() =>
            validateEnv({ ...complete, FRONTEND_URL: 'not-a-url' }),
        ).toThrow(/FRONTEND_URL/);
    });

    it('rejects ADMIN_PORT equal to PORT', () => {
        expect(() =>
            validateEnv({ ...complete, PORT: '5000', ADMIN_PORT: '5000' }),
        ).toThrow(/ADMIN_PORT/);
    });

    it('rejects a malformed REDIS_URL or OTLP traces endpoint', () => {
        expect(() =>
            validateEnv({ ...complete, REDIS_URL: 'not-a-url' }),
        ).toThrow(/REDIS_URL/);
        expect(() =>
            validateEnv({
                ...complete,
                OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: 'not-a-url',
            }),
        ).toThrow(/OTEL_EXPORTER_OTLP_TRACES_ENDPOINT/);
    });
});
