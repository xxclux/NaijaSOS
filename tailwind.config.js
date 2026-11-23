/** @type {import('tailwindcss').Config} */
export default {
  content: ['./public/**/*.html', './public/js/**/*.js'],
  theme: {
    extend: {
      colors: {
        ink: '#121414',
        panel: '#171919',
        'panel-2': '#1e2020',
        'panel-3': '#262929',
        line: '#343838',
        'line-soft': '#282b2b',
        text: '#e9eaea',
        muted: '#a6acac',
        dim: '#727979',
        alert: '#ff5540',
        'alert-soft': '#ffb4a8',
        nema: '#1f8a5b',
        'nema-soft': '#7ddba8',
        gold: '#f4c430',
        police: '#3b82f6',
        medical: '#ef4444',
        fire: '#f97316',
        road: '#eab308',
        ok: '#34d399'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Consolas', 'monospace']
      },
      borderRadius: {
        card: '14px'
      },
      boxShadow: {
        alert: '0 0 30px rgba(255, 85, 64, .28)',
        panel: '0 18px 50px rgba(0, 0, 0, .35)'
      }
    }
  },
  plugins: []
};
