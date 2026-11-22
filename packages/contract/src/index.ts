export type { components, operations, paths } from './generated/api';
export * from './optionCodes';

import type { components } from './generated/api';

/** Convenience aliases for commonly used schemas. */
export type Model = components['schemas']['ModelDto'];
export type ModelStatus = components['schemas']['ModelStatus'];
export type Health = components['schemas']['HealthDto'];
