/** The chance, each session in the cold months, that it snows. */
export const SNOW_CHANCE: number

/** The computer's own time zone, such as `Europe/London`, or undefined. */
export function localTimeZone(): string | undefined

/** `south` for a time zone south of the equator, else `north`. */
export function hemisphere(timeZone: string): 'north' | 'south'

/** Whether `month` (0 for January) is a cold month in `timeZone`'s hemisphere. */
export function isColdSeason(timeZone: string, month: number): boolean

/**
 * Whether this session gets snow: a cold month where the person is, and a
 * `roll` (0 to 1) under the chance of snow.
 */
export function shouldSnow(timeZone: string | undefined, month: number, roll: number): boolean
