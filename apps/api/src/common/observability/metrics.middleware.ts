import type { NextFunction, Request, Response } from 'express';
import type { MetricsService } from './metrics.service';

const UNMATCHED_ROUTE = 'unmatched';
const NS_PER_SECOND = 1e9;

const matchedRoute = (req: Request): string => {
    const route: unknown = req.route;
    if (
        typeof route === 'object' &&
        route !== null &&
        'path' in route &&
        typeof route.path === 'string'
    ) {
        return `${req.baseUrl}${route.path}`;
    }
    return UNMATCHED_ROUTE;
};

export const createMetricsMiddleware =
    (metrics: MetricsService) =>
    (req: Request, res: Response, next: NextFunction): void => {
        const started = process.hrtime.bigint();
        res.on('finish', () => {
            const elapsed =
                Number(process.hrtime.bigint() - started) / NS_PER_SECOND;
            metrics.record(
                matchedRoute(req),
                req.method,
                res.statusCode,
                elapsed,
            );
        });
        next();
    };
