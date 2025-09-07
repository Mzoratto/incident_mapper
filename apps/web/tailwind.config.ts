import type { Config } from 'tailwindcss'
import preset from '@incident/config/tailwind/preset.cjs'

export default {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}'
  ],
  presets: [preset as unknown as Config],
  theme: { extend: {} },
  plugins: []
} satisfies Config
