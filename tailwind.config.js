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
		'animate-slide-in',
		// New semantic state colors
		'text-error',
		'bg-error-background',
		'border-error-border',
		'text-success',
		'bg-success-background',
		'border-success-border',
		'text-warning',
		'bg-warning-background',
		'border-warning-border',
		'text-neutral',
		'bg-neutral-background',
		'border-neutral-border'
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
				
				/* Semantic state colors */
				'error': '#DC2626',                  /* Red - error text, required asterisks, failed validation */
				'error-background': '#FEF2F2',       /* Light red - error message backgrounds */
				'error-border': '#FECACA',           /* Red border - error containers */
				'success': '#16A34A',                /* Green - success text, valid states */
				'success-background': '#F0FDF4',     /* Light green - success message backgrounds */
				'success-border': '#BBF7D0',         /* Green border - success containers */
				'warning': '#D97706',                /* Orange/yellow - warning text */
				'warning-background': '#FFFBEB',     /* Light yellow - warning backgrounds */
				'warning-border': '#FED7AA',         /* Yellow border - warning containers */
				'neutral': '#6B7280',                /* Gray - loading states, disabled elements */
				'neutral-background': '#F9FAFB',     /* Light gray - subtle backgrounds */
				'neutral-border': '#D1D5DB',         /* Gray border - neutral containers, loading spinners */
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