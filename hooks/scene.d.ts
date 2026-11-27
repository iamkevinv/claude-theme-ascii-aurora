/**
 * The ASCII aurora backdrop as one SVG document. With `festive`, every
 * pine is hung with coloured lights and a gold star. With `snowy`, the top
 * third of each pine is white with snow.
 */
export function auroraScene(options?: { festive?: boolean; snowy?: boolean }): string

/** The Christmas bulbs' colours: red, gold, blue, pink and green. */
export const BULBS: readonly string[]

/** The gold star on top of each pine at Christmas. */
export const STAR: string

/** The stars' tints. */
export const STAR_TINTS: readonly string[]
