import { MAX_REQUEST_ID_LENGTH } from '@common/enums/observability';
import { resolveRequestId } from './request-id';

const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('resolveRequestId', () => {
    it('echoes a valid caller-supplied request ID', () => {
        expect(resolveRequestId('req_abc-123.45')).toBe('req_abc-123.45');
    });

    it('generates a UUID when the header is absent or blank', () => {
        expect(resolveRequestId(undefined)).toMatch(UUID_PATTERN);
        expect(resolveRequestId('   ')).toMatch(UUID_PATTERN);
    });

    it('replaces unsafe or oversized caller IDs with a fresh UUID', () => {
        expect(resolveRequestId('bad\r\nheader')).toMatch(UUID_PATTERN);
        expect(resolveRequestId('a'.repeat(MAX_REQUEST_ID_LENGTH + 1))).toMatch(
            UUID_PATTERN,
        );
    });

    it('uses the first value when multiple headers are sent', () => {
        expect(resolveRequestId(['first-id', 'second-id'])).toBe('first-id');
    });
});
