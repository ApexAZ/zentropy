/**
 * Validation utilities - Bridge to validation-core module
 * This file provides backward compatibility for imports from validation.js
 */

// Re-export all validation functions from validation-core
export {
	ValidationError,
	sanitizeInput,
	validateEmail,
	isValidString,
	normalizeWhitespace,
	escapeHtml,
	preventXSS,
	createValidationError,
	validateRequired,
	validateStringLength,
	validateNumericRange,
	validatePattern,
	validatePasswordPolicy,
	assessPasswordStrength,
	checkPasswordBreaches,
	generatePasswordSuggestions,
	createSecurePassword,
	hashPassword,
	comparePasswords,
	validatePasswordChange,
	getPasswordRequirements
} from "./validation-core.js";
