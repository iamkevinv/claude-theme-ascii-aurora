// palette.js: the theme's colours for the app itself, as plain data.
//
// register.tsx builds the theme from these, and scripts/check-design.mjs
// reads them to check that DESIGN.md says the same. Change a colour here,
// then update DESIGN.md to match. The sky's colours live in scene.js.

// The colours makeColors (make-colors.js) builds the theme from. The five
// roles are the aurora's own colours, so code comes out in them: keywords
// teal, strings green, literals violet, names magenta, variables gold.
export const THEME = {
  label: 'ASCII Aurora',
  roles: { accent: '#3fe0c5', danger: '#ff6b9a', success: '#7cf29a', warning: '#f6c667', pro: '#b48cff' },
  // A daytime aurora sky: surfaces pale periwinkle, text deep indigo.
  light: {
    gray: {
      anchors: {
        'surface-0': '#e3e6f4',
        'surface-1': '#eceef9',
        'surface-2': '#f6f7fd',
        'text-primary': '#191d3a',
        'text-secondary': '#363b62',
        'text-muted': '#555a82',
      },
    },
    git: { added: '#1f8a5b', removed: '#c23a63', modified: '#a8780e', merged: '#7a4fd0' },
  },
  // A polar night: surfaces deep blue-black, text icy mint.
  dark: {
    gray: {
      anchors: {
        'surface-0': '#060b13',
        'surface-1': '#0a121c',
        'surface-2': '#0e1824',
        'surface-3': '#121e2b',
        'text-primary': '#e6f7f1',
        'text-secondary': '#b9d6ce',
        'text-muted': '#8eaea8',
      },
    },
    git: { added: '#7cf29a', removed: '#ff6b9a', modified: '#f6c667', merged: '#b48cff' },
  },
}

// The four message colours, by mode.
export const MESSAGES = {
  light: {
    'bg-user-message': '#eef0fb',
    'text-user-message': '#191d3a',
    'bg-assistant-message': '#f7f8fd',
    'text-assistant-message': '#1f2340',
  },
  dark: {
    'bg-user-message': '#0c1e26',
    'text-user-message': '#eafff8',
    'bg-assistant-message': '#08111a',
    'text-assistant-message': '#d6ebe5',
  },
}

// The soft aurora-green glow around your messages.
export const USER_MESSAGE_GLOW = '#2ee6a02e'
