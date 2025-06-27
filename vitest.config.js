import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		// Support TypeScript files
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
})