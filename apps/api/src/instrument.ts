import 'dotenv/config';
import { startTracing } from '@common/observability/tracing';

export const stopTracing = startTracing();
