/**
 * Login Validation Utilities Tests
 * Following hybrid testing approach - testing pure functions extracted from login.ts
 * TDD implementation with comprehensive edge case coverage for security-critical validation
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
	isValidEmail,
	validateLoginForm,
	sanitizeLoginInput,
	type LoginFormData,
	type LoginValidationResult
} from "../../utils/login-validation.js";

describe("Login Validation Utilities", () => {
	describe("isValidEmail", () => {
		it("should return true for valid email addresses", () => {
			const validEmails = [
				"test@example.com",
				"user.name@domain.co.uk",
				"firstname+lastname@example.org",
				"email@subdomain.example.com",
				"firstname_lastname@example.com",
				"user123@test-domain.org",
				"user@example-domain.com",
				"test.email.with+symbol@example.com"
			];

			validEmails.forEach(email => {
				expect(isValidEmail(email)).toBe(true);
			});
		});

		it("should return false for invalid email addresses", () => {
			const invalidEmails = [
				"",
				"invalid",
				"@example.com",
				"test@",
				"test@example",
				"test@.com",
				"test.example.com",
				"test@example.",
				"test @example.com",
				"test@example .com",
				"test@example..com",
				"test@@example.com",
				".test@example.com",
				"test.@example.com"
			];

			invalidEmails.forEach(email => {
				expect(isValidEmail(email)).toBe(false);
			});
		});

		it("should handle edge cases correctly", () => {
			expect(isValidEmail("a@b.co")).toBe(true); // Minimum valid
			expect(isValidEmail("a@b.c")).toBe(false); // TLD too short
			expect(isValidEmail("test@domain.museum")).toBe(true); // Long TLD
		});
	});

	describe("sanitizeLoginInput", () => {
		it("should remove script tags completely", () => {
			const maliciousInputs = [
				'<script>alert("xss")</script>Hello',
				'Hello<script>alert("xss")</script>World',
				'<script type="text/javascript">alert("xss")</script>Clean',
				'<SCRIPT>alert("xss")</SCRIPT>Text'
			];

			maliciousInputs.forEach(input => {
				const result = sanitizeLoginInput(input);
				expect(result).not.toContain("<script>");
				expect(result).not.toContain("</script>");
				expect(result).not.toContain("alert");
			});
		});

		it("should preserve expected text after removing scripts", () => {
			expect(sanitizeLoginInput('<script>alert("xss")</script>Hello')).toBe("Hello");
			expect(sanitizeLoginInput('Hello<script>alert("xss")</script>World')).toBe("HelloWorld");
			expect(sanitizeLoginInput('<script>bad()</script>Clean Text')).toBe("Clean Text");
		});

		it("should remove all HTML tags", () => {
			const htmlInputs = [
				"<div>Hello</div>",
				"<span>Text</span>",
				"<img src='x' onerror='alert(1)'>",
				"<a href='javascript:alert(1)'>Link</a>",
				"<p>Paragraph</p><div>Div</div>"
			];

			htmlInputs.forEach(input => {
				const result = sanitizeLoginInput(input);
				expect(result).not.toContain("<");
				expect(result).not.toContain(">");
			});
		});

		it("should preserve expected text after removing HTML", () => {
			expect(sanitizeLoginInput("<div>Hello</div>")).toBe("Hello");
			expect(sanitizeLoginInput("<span>Text</span>")).toBe("Text");
			expect(sanitizeLoginInput("<p>Para</p><div>Div</div>")).toBe("ParaDiv");
		});

		it("should handle mixed script and HTML tags", () => {
			const complexInput = '<div><script>alert("xss")</script>Safe<span>Text</span></div>';
			const result = sanitizeLoginInput(complexInput);
			
			expect(result).toBe("SafeText");
			expect(result).not.toContain("<");
			expect(result).not.toContain(">");
			expect(result).not.toContain("script");
			expect(result).not.toContain("alert");
		});

		it("should trim whitespace", () => {
			expect(sanitizeLoginInput("  hello  ")).toBe("hello");
			expect(sanitizeLoginInput("\t\ntext\t\n")).toBe("text");
			expect(sanitizeLoginInput("   ")).toBe("");
		});

		it("should handle empty and null-like inputs", () => {
			expect(sanitizeLoginInput("")).toBe("");
			expect(sanitizeLoginInput("   ")).toBe("");
			expect(sanitizeLoginInput("\t\n")).toBe("");
		});

		it("should preserve normal text unchanged", () => {
			const normalTexts = [
				"hello@example.com",
				"NormalPassword123!",
				"User Name",
				"test-user@domain.com",
				"Valid.Email.Address@company.org"
			];

			normalTexts.forEach(text => {
				expect(sanitizeLoginInput(text)).toBe(text.trim());
			});
		});

		it("should handle special characters safely", () => {
			expect(sanitizeLoginInput("user@domain.com")).toBe("user@domain.com");
			expect(sanitizeLoginInput("password!@#$%")).toBe("password!@#$%");
			expect(sanitizeLoginInput("name_with-special.chars")).toBe("name_with-special.chars");
		});
	});

	describe("validateLoginForm", () => {
		let validFormData: LoginFormData;

		beforeEach(() => {
			validFormData = {
				email: "test@example.com",
				password: "ValidPassword123!"
			};
		});

		it("should validate correct form data", () => {
			const result = validateLoginForm(validFormData);
			
			expect(result.isValid).toBe(true);
			expect(result.errors.email).toBeUndefined();
			expect(result.errors.password).toBeUndefined();
			expect(Object.keys(result.errors)).toHaveLength(0);
		});

		it("should provide sanitized data", () => {
			const formDataWithWhitespace = {
				email: "  test@example.com  ",
				password: "password123"
			};
			
			const result = validateLoginForm(formDataWithWhitespace);
			
			expect(result.isValid).toBe(true);
			expect(result.sanitizedData?.email).toBe("test@example.com");
			expect(result.sanitizedData?.password).toBe("password123"); // Passwords not trimmed
		});

		it("should sanitize malicious input", () => {
			const maliciousFormData = {
				email: '<script>alert("xss")</script>test@example.com',
				password: "password123"
			};
			
			const result = validateLoginForm(maliciousFormData);
			
			expect(result.sanitizedData?.email).toBe("test@example.com");
			expect(result.sanitizedData?.email).not.toContain("script");
			expect(result.sanitizedData?.email).not.toContain("alert");
		});

		it("should reject missing email", () => {
			const formData = { ...validFormData, email: "" };
			const result = validateLoginForm(formData);
			
			expect(result.isValid).toBe(false);
			expect(result.errors.email).toContain("required");
		});

		it("should reject whitespace-only email", () => {
			const formData = { ...validFormData, email: "   " };
			const result = validateLoginForm(formData);
			
			expect(result.isValid).toBe(false);
			expect(result.errors.email).toContain("required");
		});

		it("should reject invalid email format", () => {
			const invalidEmails = [
				"invalid-email",
				"@example.com",
				"test@",
				"test.example.com",
				"test@example",
				"test @example.com"
			];

			invalidEmails.forEach(email => {
				const formData = { ...validFormData, email };
				const result = validateLoginForm(formData);
				
				expect(result.isValid).toBe(false);
				expect(result.errors.email).toContain("valid email");
			});
		});

		it("should reject missing password", () => {
			const formData = { ...validFormData, password: "" };
			const result = validateLoginForm(formData);
			
			expect(result.isValid).toBe(false);
			expect(result.errors.password).toContain("required");
		});

		it("should reject whitespace-only password", () => {
			const formData = { ...validFormData, password: "   " };
			const result = validateLoginForm(formData);
			
			expect(result.isValid).toBe(false);
			expect(result.errors.password).toContain("required");
		});

		it("should accumulate multiple validation errors", () => {
			const invalidFormData = {
				email: "",
				password: ""
			};
			
			const result = validateLoginForm(invalidFormData);
			
			expect(result.isValid).toBe(false);
			expect(result.errors.email).toContain("required");
			expect(result.errors.password).toContain("required");
			expect(Object.keys(result.errors)).toHaveLength(2);
		});

		it("should handle complex invalid scenarios", () => {
			const complexInvalidData = {
				email: "invalid-email-format",
				password: ""
			};
			
			const result = validateLoginForm(complexInvalidData);
			
			expect(result.isValid).toBe(false);
			expect(result.errors.email).toContain("valid email");
			expect(result.errors.password).toContain("required");
		});

		it("should preserve original password (no trimming)", () => {
			const formDataWithPasswordSpaces = {
				email: "test@example.com",
				password: "  password with spaces  "
			};
			
			const result = validateLoginForm(formDataWithPasswordSpaces);
			
			expect(result.isValid).toBe(true);
			expect(result.sanitizedData?.password).toBe("  password with spaces  ");
		});

		it("should handle XSS in email while preserving valid parts", () => {
			const xssFormData = {
				email: '<img src=x onerror=alert(1)>user@example.com',
				password: "password123"
			};
			
			const result = validateLoginForm(xssFormData);
			
			expect(result.sanitizedData?.email).toBe("user@example.com");
			expect(result.isValid).toBe(true); // Valid after sanitization
		});

		it("should validate edge case emails correctly", () => {
			const edgeCaseEmails = [
				"a@b.co", // Minimum valid
				"test.email.with+symbol@example.com", // Complex valid
				"firstname+lastname@subdomain.example.org" // Complex valid
			];

			edgeCaseEmails.forEach(email => {
				const formData = { ...validFormData, email };
				const result = validateLoginForm(formData);
				
				expect(result.isValid).toBe(true);
				expect(result.errors.email).toBeUndefined();
			});
		});
	});
});