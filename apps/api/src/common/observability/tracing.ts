import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { DEFAULT_SERVICE_NAME } from '@common/enums/observability';

export const startTracing = (): (() => Promise<void>) => {
    const endpoint = process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT?.trim();
    if (!endpoint) {
        return () => Promise.resolve();
    }

    const serviceName =
        process.env.OTEL_SERVICE_NAME?.trim() || DEFAULT_SERVICE_NAME;

    const sdk = new NodeSDK({
        resource: resourceFromAttributes({
            [ATTR_SERVICE_NAME]: serviceName,
        }),
        traceExporter: new OTLPTraceExporter({ url: endpoint }),
        instrumentations: [
            new HttpInstrumentation(),
            new ExpressInstrumentation(),
            new PgInstrumentation(),
        ],
    });

    sdk.start();

    return () => sdk.shutdown();
};
