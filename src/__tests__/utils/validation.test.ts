import { describe, it, expect } from "vitest";
import {
	ValidationError,
	isValidEmail,
	validateString,
	validateEmail,
	validatePositiveInteger,
	validateDate,
	validateDateRange,
	sanitizeInput,
	isValidReturnUrl,
	validateLoginForm,
	type LoginValidationResult
} from "../../utils/validation-core";

describe("ValidationError", () => {
	it("should create error with message, field, and value", () => {
		const error = new ValidationError("Test error", "testField", "testValue");

		expect(error.message).toBe("Test error");
		expect(error.field).toBe("testField");
		expect(error.value).toBe("testValue");
		expect(error.name).toBe("ValidationError");
		expect(error).toBeInstanceOf(Error);
	});

	it("should create error with message only", () => {
		const error = new ValidationError("Test error");

		expect(error.message).toBe("Test error");
		expect(error.field).toBeUndefined();
		expect(error.value).toBeUndefined();
	});
});

describe("isValidEmail", () => {
	it("should return true for valid email addresses", () => {
		const validEmails = [
			"test@example.com",
			"user.name@domain.co.uk",
			"firstname+lastname@example.org",
			"email@subdomain.example.com",
			"firstname_lastname@example.com"
		];

		validEmails.forEach(email => {
			expect(isValidEmail(email)).toBe(true);
		});
	});

	it("should return false for invalid email addresses", () => {
		const invalidEmails = ["", "invalid", "@example.com", "test@", "test@example", "test@.com"];

		invalidEmails.forEach(email => {
			expect(isValidEmail(email)).toBe(false);
		});
	});
});

describe("validateString", () => {
	it("should validate and return trimmed string", () => {
		const result = validateString("  hello world  ", "test");
		expect(result).toBe("hello world");
	});

	it("should return string without trimming when trim=false", () => {
		const result = validateString("  hello  ", "test", { trim: false });
		expect(result).toBe("  hello  ");
	});

	it("should return empty string for null/undefined when not required", () => {
		expect(validateString(null, "test")).toBe("");
		expect(validateString(undefined, "test")).toBe("");
	});

	it("should throw error for null/undefined when required", () => {
		expect(() => validateString(null, "test", { required: true })).toThrow(ValidationError);
		expect(() => validateString(undefined, "test", { required: true })).toThrow(ValidationError);
	});

	it("should throw error for non-string values", () => {
		expect(() => validateString(123, "test")).toThrow(ValidationError);
		expect(() => validateString({}, "test")).toThrow(ValidationError);
	});

	it("should validate minimum length", () => {
		expect(() => validateString("hi", "test", { minLength: 5 })).toThrow(ValidationError);
		expect(validateString("hello", "test", { minLength: 5 })).toBe("hello");
	});

	it("should validate maximum length", () => {
		expect(() => validateString("toolong", "test", { maxLength: 5 })).toThrow(ValidationError);
		expect(validateString("ok", "test", { maxLength: 5 })).toBe("ok");
	});

	it("should throw error for empty string when required", () => {
		expect(() => validateString("", "test", { required: true })).toThrow(ValidationError);
		expect(() => validateString("   ", "test", { required: true })).toThrow(ValidationError);
	});
});

describe("validateEmail", () => {
	it("should validate and return lowercase email", () => {
		const result = validateEmail("TEST@EXAMPLE.COM");
		expect(result).toBe("test@example.com");
	});

	it("should throw error for invalid email format", () => {
		expect(() => validateEmail("invalid-email")).toThrow(ValidationError);
	});

	it("should throw error for empty email", () => {
		expect(() => validateEmail("")).toThrow(ValidationError);
	});

	it("should throw error for non-string email", () => {
		expect(() => validateEmail(123)).toThrow(ValidationError);
	});

	it("should use custom field name in error", () => {
		try {
			validateEmail("invalid", "customField");
		} catch (error) {
			expect(error instanceof ValidationError).toBe(true);
			expect((error as ValidationError).field).toBe("customField");
		}
	});
});

describe("validatePositiveInteger", () => {
	it("should validate positive integers", () => {
		expect(validatePositiveInteger(5, "test")).toBe(5);
		expect(validatePositiveInteger("10", "test")).toBe(10);
		expect(validatePositiveInteger(0, "test")).toBe(0);
	});

	it("should throw error for negative numbers", () => {
		expect(() => validatePositiveInteger(-1, "test")).toThrow(ValidationError);
	});

	it("should throw error for non-integer values", () => {
		expect(() => validatePositiveInteger(3.14, "test")).toThrow(ValidationError);
		expect(() => validatePositiveInteger("abc", "test")).toThrow(ValidationError);
	});

	it("should throw error for null/undefined", () => {
		expect(() => validatePositiveInteger(null, "test")).toThrow(ValidationError);
		expect(() => validatePositiveInteger(undefined, "test")).toThrow(ValidationError);
	});

	it("should validate min/max constraints", () => {
		expect(validatePositiveInteger(5, "test", { min: 3, max: 10 })).toBe(5);

		expect(() => validatePositiveInteger(2, "test", { min: 3 })).toThrow(ValidationError);

		expect(() => validatePositiveInteger(15, "test", { max: 10 })).toThrow(ValidationError);
	});
});

describe("validateDate", () => {
	it("should validate Date objects", () => {
		const date = new Date("2024-01-01");
		expect(validateDate(date, "test")).toEqual(date);
	});

	it("should validate date strings", () => {
		const result = validateDate("2024-01-01T00:00:00.000Z", "test");
		expect(result).toBeInstanceOf(Date);
		expect(result.getUTCFullYear()).toBe(2024);
	});

	it("should throw error for invalid dates", () => {
		expect(() => validateDate("invalid-date", "test")).toThrow(ValidationError);
		expect(() => validateDate(new Date("invalid"), "test")).toThrow(ValidationError);
	});

	it("should throw error for null/undefined", () => {
		expect(() => validateDate(null, "test")).toThrow(ValidationError);
		expect(() => validateDate(undefined, "test")).toThrow(ValidationError);
	});
});

describe("validateDateRange", () => {
	it("should validate valid date ranges", () => {
		const startDate = new Date("2024-01-01");
		const endDate = new Date("2024-01-02");

		expect(() => validateDateRange(startDate, endDate)).not.toThrow();
	});

	it("should throw error when end date is before start date", () => {
		const startDate = new Date("2024-01-02");
		const endDate = new Date("2024-01-01");

		expect(() => validateDateRange(startDate, endDate)).toThrow(ValidationError);
	});

	it("should throw error when dates are equal", () => {
		const date = new Date("2024-01-01");

		expect(() => validateDateRange(date, date)).toThrow(ValidationError);
	});

	it("should use custom field names in error", () => {
		const startDate = new Date("2024-01-02");
		const endDate = new Date("2024-01-01");

		try {
			validateDateRange(startDate, endDate, "customStart", "customEnd");
		} catch (error) {
			expect(error instanceof ValidationError).toBe(true);
			expect((error as ValidationError).field).toBe("customEnd");
		}
	});
});

describe("sanitizeInput", () => {
	it("should remove script tags", () => {
		const maliciousInput = '<script>alert("xss")</script>Hello';
		const result = sanitizeInput(maliciousInput);
		expect(result).toBe("Hello");
		expect(result).not.toContain("<script>");
		expect(result).not.toContain("alert");
	});

	it("should remove all HTML tags", () => {
		const htmlInput = "<div><span>Hello</span><p>World</p></div>";
		const result = sanitizeInput(htmlInput);
		expect(result).toBe("HelloWorld");
		expect(result).not.toContain("<");
		expect(result).not.toContain(">");
	});

	it("should remove dangerous protocols", () => {
		expect(sanitizeInput("javascript:alert('xss')")).toBe("alert('xss')");
		expect(sanitizeInput("vbscript:alert('xss')")).toBe("alert('xss')");
		expect(sanitizeInput("data:text/html,<script>")).toBe("text/html,");
	});

	it("should handle empty and invalid inputs", () => {
		expect(sanitizeInput("")).toBe("");
		expect(sanitizeInput("   ")).toBe("");
		expect(sanitizeInput("  hello  ")).toBe("hello");
	});

	it("should preserve normal text", () => {
		const normalText = "Hello, this is normal text!";
		expect(sanitizeInput(normalText)).toBe(normalText);
	});
});

describe("isValidReturnUrl", () => {
	const currentOrigin = "https://example.com";

	it("should accept relative URLs starting with /", () => {
		expect(isValidReturnUrl("/dashboard", currentOrigin)).toBe(true);
		expect(isValidReturnUrl("/teams/123", currentOrigin)).toBe(true);
		expect(isValidReturnUrl("/", currentOrigin)).toBe(true);
	});

	it("should reject protocol-relative URLs", () => {
		expect(isValidReturnUrl("//evil.com/steal", currentOrigin)).toBe(false);
	});

	it("should accept same-origin URLs", () => {
		expect(isValidReturnUrl("https://example.com/dashboard", currentOrigin)).toBe(true);
		expect(isValidReturnUrl("https://example.com/teams", currentOrigin)).toBe(true);
	});

	it("should reject different-origin URLs", () => {
		expect(isValidReturnUrl("https://evil.com/steal", currentOrigin)).toBe(false);
		expect(isValidReturnUrl("http://example.com/dashboard", currentOrigin)).toBe(false);
	});

	it("should reject dangerous protocols", () => {
		expect(isValidReturnUrl("javascript:alert('xss')", currentOrigin)).toBe(false);
		expect(isValidReturnUrl("data:text/html,<script>", currentOrigin)).toBe(false);
	});

	it("should handle empty and invalid inputs", () => {
		expect(isValidReturnUrl("", currentOrigin)).toBe(false);
		expect(isValidReturnUrl("http://[invalid", currentOrigin)).toBe(false);
	});
});

describe("validateLoginForm", () => {
	it("should validate correct email and password", () => {
		const result: LoginValidationResult = validateLoginForm("test@example.com", "password123");
		expect(result.isValid).toBe(true);
		expect(result.emailError).toBeUndefined();
		expect(result.passwordError).toBeUndefined();
	});

	it("should catch empty email", () => {
		const result: LoginValidationResult = validateLoginForm("", "password123");
		expect(result.isValid).toBe(false);
		expect(result.emailError).toBeDefined();
		expect(result.emailError).toContain("cannot be empty");
	});

	it("should catch invalid email format", () => {
		const result: LoginValidationResult = validateLoginForm("invalid-email", "password123");
		expect(result.isValid).toBe(false);
		expect(result.emailError).toBeDefined();
		expect(result.emailError).toContain("valid email");
	});

	it("should catch empty password", () => {
		const result: LoginValidationResult = validateLoginForm("test@example.com", "");
		expect(result.isValid).toBe(false);
		expect(result.passwordError).toBeDefined();
		expect(result.passwordError).toContain("cannot be empty");
	});

	it("should catch both email and password errors", () => {
		const result: LoginValidationResult = validateLoginForm("", "");
		expect(result.isValid).toBe(false);
		expect(result.emailError).toBeDefined();
		expect(result.passwordError).toBeDefined();
	});

	it("should handle whitespace-only inputs", () => {
		const result: LoginValidationResult = validateLoginForm("   ", "   ");
		expect(result.isValid).toBe(false);
		expect(result.emailError).toBeDefined();
		expect(result.passwordError).toBeDefined();
	});

	it("should validate complex valid email formats", () => {
		const validEmails = [
			"user@example.com",
			"user.name@example.com",
			"user+tag@example.co.uk",
			"user123@test-domain.org"
		];

		validEmails.forEach(email => {
			const result = validateLoginForm(email, "password123");
			expect(result.isValid).toBe(true);
			expect(result.emailError).toBeUndefined();
		});
	});

	it("should reject invalid email formats", () => {
		const invalidEmails = ["user@", "@example.com", "user.example.com", "user@.com", "user@com"];

		invalidEmails.forEach(email => {
			const result = validateLoginForm(email, "password123");
			expect(result.isValid).toBe(false);
			expect(result.emailError).toBeDefined();
		});
	});
});
