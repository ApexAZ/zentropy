/**
 * Common validation utilities for the application
 */

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
 * Email validation using RFC 5322 compliant regex
 */
export function isValidEmail(email: string): boolean {
	const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
	return emailRegex.test(email);
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
