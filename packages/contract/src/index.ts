export type { components, operations, paths } from './generated/api';
export * from './optionCodes';

import type { components } from './generated/api';

type Schemas = components['schemas'];

/** Every API response is wrapped in this envelope; `data` holds the payload. */
export type ApiEnvelope<T> = Schemas['ApiEnvelopeDto'] & { data: T };

/** Convenience aliases for commonly used schemas. */
export type Health = Schemas['HealthResponseDto'];
export type User = Schemas['UserResponseDto'];
export type UserRole = Schemas['UserRole'];
export type UserAccountStatus = Schemas['UserAccountStatus'];
export type AuthResponse = Schemas['AuthResponseDto'];
export type Period = Schemas['Period'];
export type PeriodTotal = Schemas['PeriodTotalResponseDto'];
export type PeriodSeries = Schemas['PeriodSeriesResponseDto'];
