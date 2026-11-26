import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import {
    MAX_REQUEST_ID_LENGTH,
    REQUEST_ID_HEADER,
    REQUEST_ID_HEADER_LOWER,
} from '@common/enums/observability';

const SAFE_REQUEST_ID = /^[a-zA-Z0-9._-]+$/;

export const resolveRequestId = (
    header: string | string[] | undefined,
): string => {
    const candidate = (Array.isArray(header) ? header[0] : header)?.trim();
    if (
        candidate &&
        candidate.length <= MAX_REQUEST_ID_LENGTH &&
        SAFE_REQUEST_ID.test(candidate)
    ) {
        return candidate;
    }
    return randomUUID();
};

export const requestIdMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction,
): void => {
    const id = resolveRequestId(req.headers[REQUEST_ID_HEADER_LOWER]);
    req.headers[REQUEST_ID_HEADER_LOWER] = id;
    res.setHeader(REQUEST_ID_HEADER, id);
    next();
};
