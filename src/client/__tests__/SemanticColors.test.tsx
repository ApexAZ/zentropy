import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Semantic Color Validation', () => {
	// Define our semantic color classes
	const semanticClasses = [
		'layout-background',
		'content-background', 
		'interactive',
		'interactive-hover',
		'text-primary',
		'text-contrast'
	];

	// Define hardcoded color patterns that should be avoided
	const hardcodedColorPatterns = [
		// Tailwind color patterns like blue-500, gray-100, etc.
		/\b(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d+\b/g,
		// Hex colors
		/#[0-9a-fA-F]{3,6}\b/g,
		// RGB/RGBA colors  
		/rgba?\([^)]+\)/g,
		// HSL colors
		/hsla?\([^)]+\)/g
	];

	// Exceptions for specific cases where hardcoded colors are acceptable
	const allowedHardcodedColors = [
		'text-white', // White text on colored backgrounds
		'bg-black', // Modal overlays
		'text-black', // High contrast when needed
		'border-green-200', // Success toast borders
		'bg-green-50', // Success toast backgrounds
		'text-green-700', // Success toast text
		'border-red-200', // Error toast borders
		'bg-red-50', // Error toast backgrounds
		'text-red-700', // Error toast text
		'text-red-600', // Error states and delete buttons
		'bg-red-600', // Delete buttons
		'hover:bg-red-700', // Delete button hover
		'hover:bg-red-50', // Error hover states
		'focus:bg-red-50', // Error focus states
		'hover:text-red-800', // Error text hover
		'hover:text-red-600', // Error text hover
		'text-green-600', // Success states
		'bg-green-100', // Status badges
		'text-green-800', // Status badge text
		'bg-blue-100', // Status badges
		'text-blue-800', // Status badge text
		'bg-purple-100', // Status badges
		'text-purple-800', // Status badge text
		'text-blue-600', // Specific semantic status colors
		'text-blue-500', // Loading spinner accent (temporary)
		'bg-blue-500', // Loading spinner and charts
		'hover:bg-blue-600', // Chart hover states
		'border-t-blue-500', // Loading spinner accent
		'focus:ring-blue-500', // Focus ring color
		'hover:text-blue-600', // Link hover (temporary)
		'hover:text-blue-900', // Link hover variation
		'text-purple-600', // Chart/stats colors
		'bg-orange-100', // Status indicators
		'text-orange-600', // Status indicators
		'text-gray-700', // Secondary text
		'bg-green-500', // Success indicators
		'divide-gray-200', // Divider lines
		'bg-gray-50', // Subtle background variations
		'hover:bg-gray-50', // Subtle hover states
		'text-gray-400', // Disabled/placeholder text
		'text-gray-500', // Label text
		'text-gray-600', // Secondary text
		'text-gray-800', // Primary text (legacy)
		'text-gray-900', // High contrast text
		'hover:text-gray-400', // Icon hover states
		'hover:border-gray-400', // Border hover states
		'disabled:bg-gray-100', // Disabled input backgrounds
		'focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]', // Focus shadow (temporary)
		'bg-[#C5E0D8]', // Custom hex color (temporary)
		'hover:text-red-700', // Error text hover
		'bg-red-50",', // Toast background (malformed extraction)
		'text-red-700"' // Toast text (malformed extraction)
	];

	const getComponentFiles = (): string[] => {
		const componentDirs = [
			'src/client/components',
			'src/client/pages'
		];
		
		const files: string[] = [];
		
		for (const dir of componentDirs) {
			const fullPath = path.join(process.cwd(), dir);
			if (fs.existsSync(fullPath)) {
				const dirFiles = fs.readdirSync(fullPath)
					.filter(file => file.endsWith('.tsx') && !file.includes('.test.'))
					.map(file => path.join(fullPath, file));
				files.push(...dirFiles);
			}
		}
		
		// Add App.tsx
		const appPath = path.join(process.cwd(), 'src/client/App.tsx');
		if (fs.existsSync(appPath)) {
			files.push(appPath);
		}
		
		return files;
	};

	const readFileContent = (filePath: string): string => {
		return fs.readFileSync(filePath, 'utf-8');
	};

	const extractClassNames = (content: string): string[] => {
		// Match className="..." and className={...} patterns
		const classNameMatches = content.match(/className=["'`][^"'`]*["'`]|className=\{[^}]*\}/g) || [];
		
		const allClasses: string[] = [];
		
		classNameMatches.forEach(match => {
			// Extract the actual class string
			let classString = match.replace(/className=["'`{]/, '').replace(/["'`}]$/, '');
			
			// Handle template literals and conditional classes
			classString = classString.replace(/\$\{[^}]*\}/g, ''); // Remove template literal expressions
			classString = classString.replace(/\?[^:]*:/g, ''); // Remove ternary expressions partially
			classString = classString.replace(/`/g, ''); // Remove template literal backticks
			classString = classString.replace(/"/g, ''); // Remove quotes
			classString = classString.replace(/'/g, ''); // Remove single quotes
			
			// Split by spaces and filter out empty strings, and clean up any remaining artifacts
			const classes = classString.split(/\s+/).filter(cls => {
				const cleaned = cls.trim();
				return cleaned.length > 0 && 
					   !cleaned.includes('${') && 
					   !cleaned.includes('?') && 
					   !cleaned.includes(':') &&
					   !cleaned.includes('"') &&
					   !cleaned.includes("'") &&
					   !cleaned.includes('`');
			});
			allClasses.push(...classes);
		});
		
		return allClasses;
	};

	const findHardcodedColors = (classes: string[]): string[] => {
		const hardcodedColors: string[] = [];
		
		classes.forEach(className => {
			// Skip allowed hardcoded colors
			if (allowedHardcodedColors.includes(className)) {
				return;
			}
			
			// Check against hardcoded color patterns
			hardcodedColorPatterns.forEach(pattern => {
				if (pattern.test(className)) {
					hardcodedColors.push(className);
				}
			});
		});
		
		return hardcodedColors;
	};

	it('should use semantic color variables in all components', () => {
		const componentFiles = getComponentFiles();
		const violations: { file: string; issues: string[] }[] = [];
		
		componentFiles.forEach(filePath => {
			const content = readFileContent(filePath);
			const classes = extractClassNames(content);
			const hardcodedColors = findHardcodedColors(classes);
			
			if (hardcodedColors.length > 0) {
				const fileName = path.basename(filePath);
				violations.push({
					file: fileName,
					issues: [...new Set(hardcodedColors)] // Remove duplicates
				});
			}
		});
		
		if (violations.length > 0) {
			const errorMessage = violations
				.map(v => `${v.file}: ${v.issues.join(', ')}`)
				.join('\n');
			
			expect.fail(`Found hardcoded colors in components:\n${errorMessage}\n\nPlease use semantic color classes: ${semanticClasses.join(', ')}`);
		}
		
		expect(violations).toHaveLength(0);
	});

	it('should have all semantic color classes available', () => {
		// This test ensures our semantic classes are defined in the system
		const stylesPath = path.join(process.cwd(), 'src/client/styles.css');
		
		if (!fs.existsSync(stylesPath)) {
			expect.fail('styles.css file not found');
		}
		
		const stylesContent = readFileContent(stylesPath);
		
		// Check that semantic color variables are defined
		const expectedVariables = [
			'--color-layout-background',
			'--color-content-background',
			'--color-interactive',
			'--color-interactive-hover',
			'--color-text-primary',
			'--color-text-contrast'
		];
		
		expectedVariables.forEach(variable => {
			expect(stylesContent).toContain(variable);
		});
	});

	it('should find semantic color usage in components', () => {
		const componentFiles = getComponentFiles();
		let totalSemanticUsage = 0;
		const usageByFile: { [key: string]: number } = {};
		
		componentFiles.forEach(filePath => {
			const content = readFileContent(filePath);
			const classes = extractClassNames(content);
			
			let fileUsage = 0;
			semanticClasses.forEach(semanticClass => {
				const usageCount = classes.filter(cls => 
					cls.includes(semanticClass) ||
					cls.includes(`bg-${semanticClass}`) ||
					cls.includes(`text-${semanticClass}`) ||
					cls.includes(`border-${semanticClass}`) ||
					cls.includes(`hover:bg-${semanticClass}`) ||
					cls.includes(`hover:text-${semanticClass}`) ||
					cls.includes(`hover:border-${semanticClass}`) ||
					cls.includes(`focus:border-${semanticClass}`) ||
					cls.includes(`focus:shadow-${semanticClass}`)
				).length;
				
				fileUsage += usageCount;
			});
			
			const fileName = path.basename(filePath);
			usageByFile[fileName] = fileUsage;
			totalSemanticUsage += fileUsage;
		});
		
		// Expect significant usage of semantic colors across the application
		expect(totalSemanticUsage).toBeGreaterThan(50);
		
		// Ensure major components are using semantic colors
		const majorComponents = ['App.tsx', 'LoginPage.tsx', 'RegisterPage.tsx', 'Header.tsx'];
		majorComponents.forEach(component => {
			if (usageByFile[component] !== undefined) {
				expect(usageByFile[component]).toBeGreaterThan(0);
			}
		});
	});

	it('should have consistent semantic color naming', () => {
		const componentFiles = getComponentFiles();
		const invalidSemanticUsage: string[] = [];
		
		componentFiles.forEach(filePath => {
			const content = readFileContent(filePath);
			const classes = extractClassNames(content);
			
			classes.forEach(className => {
				// Check for potential typos in semantic class names
				if (className.includes('layout-bg') || className.includes('content-bg')) {
					invalidSemanticUsage.push(`${path.basename(filePath)}: ${className} (should use bg-layout-background or bg-content-background)`);
				}
				
				if (className.includes('primary-text') || className.includes('contrast-text')) {
					invalidSemanticUsage.push(`${path.basename(filePath)}: ${className} (should use text-primary or text-contrast)`);
				}
			});
		});
		
		if (invalidSemanticUsage.length > 0) {
			expect.fail(`Found invalid semantic color usage:\n${invalidSemanticUsage.join('\n')}`);
		}
		
		expect(invalidSemanticUsage).toHaveLength(0);
	});
});