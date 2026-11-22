// Hand-written option codes shared by web and api.
// Intentionally empty for now: populate as the configurator is designed.
export const OPTION_CODES = {} as const;

export type OptionCode = keyof typeof OPTION_CODES;
