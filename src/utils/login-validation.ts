/**
 * Login Validation Utilities
 * Pure functions extracted from login.ts following hybrid testing approach
 * These functions handle validation logic without DOM dependencies for easy testing
 */

// Type definitions for login validation
export interface LoginFormData {
	email: string;
	password: string;
}

export interface LoginValidationResult {
	isValid: boolean;
	errors: Record<string, string>;
	sanitizedData?: LoginFormData;
}

/**
 * Validate email format using regex
 * @param email - Email address to validate
 * @returns True if email format is valid
 */
export function isValidEmail(email: string): boolean {
	// More strict email validation
	const emailRegex = /^[a-zA-Z0-9]([a-zA-Z0-9._%+-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/;
	
	// Additional checks for edge cases
	if (email.includes('..') || email.includes('@@')) {
		return false;
	}
	
	return emailRegex.test(email);
}

/**
 * Sanitize input to prevent XSS attacks
 * @param input - Input string to sanitize
 * @returns Sanitized string with dangerous content removed
 */
export function sanitizeLoginInput(input: string): string {
	// Remove script tags and other dangerous content
	return input
		.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
		.replace(/<[^>]*>/g, "")
		.trim();
}

/**
 * Validate login form data with sanitization
 * @param formData - The form data to validate
 * @returns Validation result with errors and sanitized data
 */
export function validateLoginForm(formData: LoginFormData): LoginValidationResult {
	const errors: Record<string, string> = {};
	
	// Sanitize inputs first
	const sanitizedEmail = sanitizeLoginInput(formData.email);
	const sanitizedPassword = formData.password; // Don't trim passwords
	
	// Validate email
	if (!sanitizedEmail) {
		errors.email = "Email is required";
	} else if (!isValidEmail(sanitizedEmail)) {
		errors.email = "Please enter a valid email address";
	}
	
	// Validate password (don't trim, but check if it's only whitespace)
	if (!sanitizedPassword?.trim()) {
		errors.password = "Password is required";
	}
	
	// Create sanitized data
	const sanitizedData: LoginFormData = {
		email: sanitizedEmail,
		password: sanitizedPassword
	};
	
	return {
		isValid: Object.keys(errors).length === 0,
		errors,
		sanitizedData
	};
}