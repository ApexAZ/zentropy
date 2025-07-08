/** @type {import('tailwindcss').Config} */
export default {
	content: [
		"./**/*.{js,ts,jsx,tsx}",
		"./index.html"
	],
	safelist: [
		'text-interactive',
		'text-text-primary',
		'bg-layout-background',
		'bg-content-background',
		'bg-interactive',
		'bg-interactive-hover',
		'border-layout-background',
		'border-interactive',
		'hover:bg-interactive-hover',
		'hover:text-interactive-hover',
		'focus:border-interactive',
		'focus:shadow-interactive',
		'focus:outline-none',
		'animate-slide-in'
	],
	theme: {
		extend: {
			colors: {
				'layout-background': '#F0F0F0',      /* Cool light gray - page backgrounds, borders, sections */
				'content-background': '#FFFFFF',     /* White - form containers, input fields */
				'interactive': '#6A8BA7',            /* Steel blue - buttons, links, focus states */
				'interactive-hover': '#B8D4F0',      /* Pastel blue - hover feedback */
				'text-primary': '#4A4A4A',           /* Dark gray - headings, body text, labels */
				'text-contrast': '#000000',          /* Black - high contrast when needed */
			},
			boxShadow: {
				'interactive': '0 0 0 3px rgba(106, 139, 167, 0.2)', /* Focus ring using interactive color */
			},
			animation: {
				'slide-in': 'slideIn 0.3s ease',
			},
			keyframes: {
				slideIn: {
					'from': { opacity: '0', transform: 'translateX(100%)' },
					'to': { opacity: '1', transform: 'translateX(0)' }
				}
			}
		},
	},
	plugins: [],
}