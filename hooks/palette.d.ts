import type { makeColors } from './make-colors.js'

type Hex = `#${string}`

type MessageColours = Record<'bg-user-message' | 'text-user-message' | 'bg-assistant-message' | 'text-assistant-message', Hex>

/** What makeColors builds the theme from. */
export const THEME: Parameters<typeof makeColors>[0]

/** The four message colours, by mode. */
export const MESSAGES: { light: MessageColours; dark: MessageColours }

/** The glow around your messages, with its alpha. */
export const USER_MESSAGE_GLOW: Hex
