/**
 * Consolidated validation utilities for the application
 * Combines validation.ts and password-policy.ts into a single core module
 */

// ============= TYPE DEFINITIONS =============

/**
 * Validation error class for consistent error handling
 */
export class ValidationError extends Error {
	constructor(
		message: string,
		public readonly field?: string,
		public readonly value?: unknown
	) {
		super(message);
		this.name = "ValidationError";
	}
}

/**
 * Validation result for login forms
 */
export interface LoginValidationResult {
	isValid: boolean;
	emailError?: string;
	passwordError?: string;
}

/**
 * Password validation result interface
 */
export interface ValidationResult {
	isValid: boolean;
	errors: string[];
}

/**
 * Password strength assessment
 */
export interface PasswordStrength {
	score: number;
	strength: "Very Weak" | "Weak" | "Fair" | "Good" | "Excellent";
	feedback: string[];
}

/**
 * User information for password validation context
 */
export interface UserInfo {
	email?: string;
	firstName?: string;
	lastName?: string;
}

/**
 * Password validation options
 */
export interface PasswordValidationOptions {
	userInfo?: UserInfo;
	previousPasswords?: string[];
}

/**
 * Comprehensive validation result with strength assessment
 */
export interface ComprehensiveValidationResult extends ValidationResult {
	strength: PasswordStrength;
}

// ============= VALIDATION UTILITIES =============

/**
 * Email validation using RFC 5322 compliant regex
 * Pre-compiled regex for better performance
 */
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export function isValidEmail(email: string): boolean {
	return EMAIL_REGEX.test(email);
}

/**
 * Validate and sanitize string input
 */
export function validateString(
	value: unknown,
	fieldName: string,
	options: {
		required?: boolean;
		minLength?: number;
		maxLength?: number;
		trim?: boolean;
	} = {}
): string {
	const { required = false, minLength = 0, maxLength = Infinity, trim = true } = options;

	if (value === null || value === undefined) {
		if (required) {
			throw new ValidationError(`${fieldName} is required`, fieldName, value);
		}
		return "";
	}

	if (typeof value !== "string") {
		throw new ValidationError(`${fieldName} must be a string`, fieldName, value);
	}

	const processed = trim ? value.trim() : value;

	if (required && processed.length === 0) {
		throw new ValidationError(`${fieldName} cannot be empty`, fieldName, value);
	}

	if (processed.length < minLength) {
		throw new ValidationError(`${fieldName} must be at least ${minLength} characters`, fieldName, value);
	}

	if (processed.length > maxLength) {
		throw new ValidationError(`${fieldName} must be no more than ${maxLength} characters`, fieldName, value);
	}

	return processed;
}

/**
 * Validate email address
 */
export function validateEmail(email: unknown, fieldName = "email"): string {
	const validatedEmail = validateString(email, fieldName, {
		required: true,
		maxLength: 255
	}).toLowerCase();

	if (!isValidEmail(validatedEmail)) {
		throw new ValidationError(`${fieldName} must be a valid email address`, fieldName, email);
	}

	return validatedEmail;
}

/**
 * Validate positive integer
 */
export function validatePositiveInteger(
	value: unknown,
	fieldName: string,
	options: { min?: number; max?: number } = {}
): number {
	const { min = 0, max = Infinity } = options;

	if (value === null || value === undefined) {
		throw new ValidationError(`${fieldName} is required`, fieldName, value);
	}

	const parsed = Number(value);

	if (!Number.isInteger(parsed) || parsed < 0) {
		throw new ValidationError(`${fieldName} must be a positive integer`, fieldName, value);
	}

	if (parsed < min) {
		throw new ValidationError(`${fieldName} must be at least ${min}`, fieldName, value);
	}

	if (parsed > max) {
		throw new ValidationError(`${fieldName} must be no more than ${max}`, fieldName, value);
	}

	return parsed;
}

/**
 * Validate date
 */
export function validateDate(value: unknown, fieldName: string): Date {
	if (!value) {
		throw new ValidationError(`${fieldName} is required`, fieldName, value);
	}

	const date = value instanceof Date ? value : new Date(value as string);

	if (isNaN(date.getTime())) {
		throw new ValidationError(`${fieldName} must be a valid date`, fieldName, value);
	}

	return date;
}

/**
 * Validate that end date is after start date
 */
export function validateDateRange(
	startDate: Date,
	endDate: Date,
	startFieldName = "start_date",
	endFieldName = "end_date"
): void {
	if (endDate <= startDate) {
		throw new ValidationError(`${endFieldName} must be after ${startFieldName}`, endFieldName, endDate);
	}
}

/**
 * Sanitizes input to prevent XSS attacks
 * Removes script tags, HTML tags, and dangerous protocols
 * Pre-compiled regexes for better performance
 */
const SCRIPT_TAG_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const HTML_TAG_REGEX = /<[^>]*>/g;
const JAVASCRIPT_PROTOCOL_REGEX = /javascript:/gi;
const VBSCRIPT_PROTOCOL_REGEX = /vbscript:/gi;
const DATA_PROTOCOL_REGEX = /data:/gi;

export function sanitizeInput(input: string): string {
	if (!input || typeof input !== "string") {
		return "";
	}

	return input
		.replace(SCRIPT_TAG_REGEX, "") // Remove script tags
		.replace(HTML_TAG_REGEX, "") // Remove all HTML tags
		.replace(JAVASCRIPT_PROTOCOL_REGEX, "") // Remove javascript: protocol
		.replace(VBSCRIPT_PROTOCOL_REGEX, "") // Remove vbscript: protocol
		.replace(DATA_PROTOCOL_REGEX, "") // Remove data: protocol
		.trim();
}

/**
 * Validates that a URL is safe for redirection (same-origin only)
 */
export function isValidReturnUrl(url: string, currentOrigin: string): boolean {
	if (!url || typeof url !== "string") {
		return false;
	}

	// Only allow relative URLs or same-origin URLs
	try {
		if (url.startsWith("/") && !url.startsWith("//")) {
			// Relative URL - safe
			return true;
		}

		const returnUrl = new URL(url, currentOrigin);
		return returnUrl.origin === currentOrigin;
	} catch {
		// If URL parsing fails, reject it
		return false;
	}
}

/**
 * Validates login form data and returns detailed validation results
 */
export function validateLoginForm(email: string, password: string): LoginValidationResult {
	const result: LoginValidationResult = { isValid: true };

	// Validate email
	try {
		validateEmail(email, "email");
	} catch (error) {
		result.isValid = false;
		if (error instanceof ValidationError) {
			result.emailError = error.message;
		} else {
			result.emailError = "Invalid email";
		}
	}

	// Validate password
	try {
		validateString(password, "password", { required: true });
	} catch (error) {
		result.isValid = false;
		if (error instanceof ValidationError) {
			result.passwordError = error.message;
		} else {
			result.passwordError = "Invalid password";
		}
	}

	return result;
}

// ============= PASSWORD POLICY UTILITIES =============

/**
 * Password policy enforcement class
 */
export class PasswordPolicy {
	private static readonly MIN_LENGTH = 8;
	private static readonly MAX_LENGTH = 128;

	private static readonly COMMON_PASSWORDS = [
		"password",
		"password123",
		"admin",
		"admin123",
		"qwerty",
		"qwerty123",
		"123456",
		"1234567",
		"12345678",
		"123456789",
		"1234567890",
		"letmein",
		"welcome",
		"monkey",
		"dragon",
		"abc123",
		"iloveyou",
		"trustno1",
		"sunshine",
		"master",
		"hello",
		"freedom",
		"whatever",
		"football",
		"jesus",
		"ninja",
		"mustang",
		"access",
		"shadow",
		"michael",
		"superman",
		"696969",
		"batman",
		"hunter",
		"mustang",
		"tiger",
		"hottie",
		"angels",
		"prince",
		"nascar",
		"peanut"
	];

	private static readonly SPECIAL_CHARS = "!@#$%^&*()_+-=[]{}|;:,.<>?";

	static validateLength(password: string): ValidationResult {
		const errors: string[] = [];

		if (password.length < this.MIN_LENGTH) {
			errors.push(`Password must be at least ${this.MIN_LENGTH} characters long`);
		}

		if (password.length > this.MAX_LENGTH) {
			errors.push(`Password must not exceed ${this.MAX_LENGTH} characters`);
		}

		return {
			isValid: errors.length === 0,
			errors
		};
	}

	private static readonly UPPERCASE_REGEX = /[A-Z]/;
	private static readonly LOWERCASE_REGEX = /[a-z]/;
	private static readonly DIGIT_REGEX = /\d/;
	private static readonly SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/;

	static validateComplexity(password: string): ValidationResult {
		const errors: string[] = [];

		if (!this.UPPERCASE_REGEX.test(password)) {
			errors.push("Password must contain at least one uppercase letter");
		}

		if (!this.LOWERCASE_REGEX.test(password)) {
			errors.push("Password must contain at least one lowercase letter");
		}

		if (!this.DIGIT_REGEX.test(password)) {
			errors.push("Password must contain at least one number");
		}

		if (!this.SPECIAL_CHAR_REGEX.test(password)) {
			errors.push(`Password must contain at least one special character (${this.SPECIAL_CHARS})`);
		}

		return {
			isValid: errors.length === 0,
			errors
		};
	}

	static validateForbiddenPatterns(password: string, userInfo?: UserInfo): ValidationResult {
		const errors: string[] = [];
		const lowerPassword = password.toLowerCase();

		if (this.COMMON_PASSWORDS.some(common => lowerPassword.includes(common.toLowerCase()))) {
			errors.push("Password is too common and easily guessable");
		}

		if (this.hasSequentialCharacters(password)) {
			errors.push("Password contains sequential characters");
		}

		if (this.hasRepeatedCharacters(password)) {
			errors.push("Password contains too many repeated characters");
		}

		if (userInfo && this.containsUserInfo(password, userInfo)) {
			errors.push("Password should not contain personal information");
		}

		return {
			isValid: errors.length === 0,
			errors
		};
	}

	static calculatePasswordStrength(password: string): PasswordStrength {
		let score = 0;
		const feedback: string[] = [];

		// Length scoring
		if (password.length >= 8) {
			score += 5;
		}
		if (password.length >= 12) {
			score += 5;
		}
		if (password.length >= 16) {
			score += 8;
		}

		// Character type scoring - reuse pre-compiled regexes
		if (this.LOWERCASE_REGEX.test(password)) {
			score += 5;
		} else {
			feedback.push("Add lowercase letters");
		}

		if (this.UPPERCASE_REGEX.test(password)) {
			score += 5;
		} else {
			feedback.push("Add uppercase letters");
		}

		if (this.DIGIT_REGEX.test(password)) {
			score += 8;
		} else {
			feedback.push("Add numbers");
		}

		if (this.SPECIAL_CHAR_REGEX.test(password)) {
			score += 8;
		} else {
			feedback.push("Add special characters");
		}

		// Character diversity scoring
		const uniqueChars = new Set(password.toLowerCase()).size;
		if (uniqueChars >= 6) {
			score += 5;
		}
		if (uniqueChars >= 10) {
			score += 8;
		}

		// Length + diversity bonus
		if (password.length >= 16 && uniqueChars >= 10) {
			score += 12;
		}

		// Pattern checking
		const lowerPassword = password.toLowerCase();
		if (!this.COMMON_PASSWORDS.some(common => lowerPassword.includes(common))) {
			score += 5;
		} else {
			feedback.push("Avoid common words");
			score -= 2; // Penalty for common words
		}

		if (!this.hasSequentialCharacters(password)) {
			score += 3;
		} else {
			feedback.push("Avoid sequential characters");
		}

		if (!this.hasRepeatedCharacters(password)) {
			score += 3;
		} else {
			feedback.push("Avoid repeated characters");
		}

		// Determine strength category
		let strength: PasswordStrength["strength"];
		if (score < 20) {
			strength = "Very Weak";
		} else if (score < 40) {
			strength = "Weak";
		} else if (score < 60) {
			strength = "Fair";
		} else if (score < 80) {
			strength = "Good";
		} else {
			strength = "Excellent";
		}

		return { score, strength, feedback };
	}

	static validatePasswordReuse(password: string, previousPasswords: string[] = []): ValidationResult {
		const errors: string[] = [];

		if (previousPasswords.includes(password)) {
			errors.push("Password has been used recently and cannot be reused");
		}

		const similarity = previousPasswords.some(prev => this.calculateSimilarity(password, prev) > 0.7);

		if (similarity) {
			errors.push("Password is too similar to a recently used password");
		}

		return {
			isValid: errors.length === 0,
			errors
		};
	}

	static validatePassword(password: string, options: PasswordValidationOptions = {}): ComprehensiveValidationResult {
		const allErrors: string[] = [];

		const lengthResult = this.validateLength(password);
		allErrors.push(...lengthResult.errors);

		const complexityResult = this.validateComplexity(password);
		allErrors.push(...complexityResult.errors);

		const forbiddenResult = this.validateForbiddenPatterns(password, options.userInfo);
		allErrors.push(...forbiddenResult.errors);

		const reuseResult = this.validatePasswordReuse(password, options.previousPasswords);
		allErrors.push(...reuseResult.errors);

		const strength = this.calculatePasswordStrength(password);

		return {
			isValid: allErrors.length === 0,
			errors: allErrors,
			strength
		};
	}

	private static hasSequentialCharacters(password: string): boolean {
		const sequences = [
			"0123456789",
			"abcdefghijklmnopqrstuvwxyz",
			"ABCDEFGHIJKLMNOPQRSTUVWXYZ",
			"qwertyuiopasdfghjklzxcvbnm",
			"QWERTYUIOPASDFGHJKLZXCVBNM"
		];

		for (const sequence of sequences) {
			for (let i = 0; i <= sequence.length - 4; i++) {
				const subseq = sequence.substring(i, i + 4);
				if (password.includes(subseq)) {
					return true;
				}
			}
		}

		return false;
	}

	private static hasRepeatedCharacters(password: string): boolean {
		for (let i = 0; i <= password.length - 3; i++) {
			const char = password[i];
			if (password[i + 1] === char && password[i + 2] === char) {
				return true;
			}
		}
		return false;
	}

	private static containsUserInfo(password: string, userInfo: UserInfo): boolean {
		const lowerPassword = password.toLowerCase();

		if (userInfo.firstName && lowerPassword.includes(userInfo.firstName.toLowerCase())) {
			return true;
		}

		if (userInfo.lastName && lowerPassword.includes(userInfo.lastName.toLowerCase())) {
			return true;
		}

		if (userInfo.email) {
			const emailParts = userInfo.email.toLowerCase().split("@");
			const username = emailParts[0];
			const domainPart = emailParts[1];

			if (username && lowerPassword.includes(username)) {
				return true;
			}

			if (domainPart) {
				const domain = domainPart.split(".")[0];
				if (domain && domain.length > 3 && lowerPassword.includes(domain)) {
					return true;
				}
			}
		}

		return false;
	}

	private static calculateSimilarity(str1: string, str2: string): number {
		const longer = str1.length > str2.length ? str1 : str2;
		const shorter = str1.length > str2.length ? str2 : str1;

		if (longer.length === 0) {
			return 1.0;
		}

		const editDistance = this.levenshteinDistance(longer, shorter);
		return (longer.length - editDistance) / longer.length;
	}

	private static levenshteinDistance(str1: string, str2: string): number {
		const m = str1.length;
		const n = str2.length;

		// Create and initialize matrix explicitly to satisfy TypeScript
		const matrix: number[][] = [];
		for (let i = 0; i <= n; i++) {
			matrix[i] = [];
			const currentRow = matrix[i];
			if (!currentRow) {
				throw new Error("Failed to initialize matrix row");
			}

			for (let j = 0; j <= m; j++) {
				if (i === 0) {
					currentRow[j] = j;
				} else if (j === 0) {
					currentRow[j] = i;
				} else {
					currentRow[j] = 0;
				}
			}
		}

		// Fill the matrix with explicit null checks
		for (let i = 1; i <= n; i++) {
			for (let j = 1; j <= m; j++) {
				const currentRow = matrix[i];
				const previousRow = matrix[i - 1];

				if (!currentRow || !previousRow) {
					throw new Error("Matrix initialization error");
				}

				if (str2[i - 1] === str1[j - 1]) {
					const prevValue = previousRow[j - 1];
					if (prevValue === undefined) {
						throw new Error("Matrix access error");
					}
					currentRow[j] = prevValue;
				} else {
					const subst = previousRow[j - 1];
					const insert = currentRow[j - 1];
					const del = previousRow[j];

					if (subst === undefined || insert === undefined || del === undefined) {
						throw new Error("Matrix access error");
					}

					currentRow[j] = Math.min(subst + 1, insert + 1, del + 1);
				}
			}
		}

		const finalRow = matrix[n];
		if (!finalRow) {
			throw new Error("Matrix access error");
		}

		const result = finalRow[m];
		if (result === undefined) {
			throw new Error("Matrix access error");
		}

		return result;
	}
}
