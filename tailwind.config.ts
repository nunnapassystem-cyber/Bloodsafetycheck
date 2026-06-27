import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#185FA5',
        'primary-dark': '#0C447C',
        'primary-light': '#D6E8FA',
        danger: '#A32D2D',
        'danger-dark': '#791F1F',
        'danger-light': '#FADBD8',
        success: '#1A7A4A',
        'success-light': '#D5F0E3',
        warning: '#B7770D',
        'warning-light': '#FDF3DC',
        blood: '#C0392B',
        'blood-light': '#FADBD8',
      },
    },
  },
  plugins: [],
}
export default config
