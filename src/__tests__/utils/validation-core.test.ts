import { describe, it, expect, test } from "vitest";
import {
	// ============= VALIDATION UTILITIES =============
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
	type LoginValidationResult,
	// ============= PASSWORD POLICY UTILITIES =============
	PasswordPolicy
} from "../../utils/validation-core";

describe("Validation Core", () => {
	// ============= VALIDATION UTILITIES TESTS (from validation.test.ts) =============
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

	// ============= PASSWORD POLICY TESTS (from password-policy.test.ts) =============
	describe("PasswordPolicy", () => {
		describe("validateLength", () => {
			test("should reject passwords shorter than minimum length", () => {
				const result = PasswordPolicy.validateLength("1234567");
				expect(result.isValid).toBe(false);
				expect(result.errors).toContain("Password must be at least 8 characters long");
			});

			test("should reject passwords longer than maximum length", () => {
				const longPassword = "a".repeat(129);
				const result = PasswordPolicy.validateLength(longPassword);
				expect(result.isValid).toBe(false);
				expect(result.errors).toContain("Password must not exceed 128 characters");
			});

			test("should accept passwords within valid length range", () => {
				const result = PasswordPolicy.validateLength("validPassword123");
				expect(result.isValid).toBe(true);
				expect(result.errors).toHaveLength(0);
			});

			test("should accept passwords at minimum length boundary", () => {
				const result = PasswordPolicy.validateLength("12345678");
				expect(result.isValid).toBe(true);
				expect(result.errors).toHaveLength(0);
			});

			test("should accept passwords at maximum length boundary", () => {
				const maxPassword = "a".repeat(128);
				const result = PasswordPolicy.validateLength(maxPassword);
				expect(result.isValid).toBe(true);
				expect(result.errors).toHaveLength(0);
			});
		});

		describe("validateComplexity", () => {
			test("should reject passwords without uppercase letters", () => {
				const result = PasswordPolicy.validateComplexity("password123!");
				expect(result.isValid).toBe(false);
				expect(result.errors).toContain("Password must contain at least one uppercase letter");
			});

			test("should reject passwords without lowercase letters", () => {
				const result = PasswordPolicy.validateComplexity("PASSWORD123!");
				expect(result.isValid).toBe(false);
				expect(result.errors).toContain("Password must contain at least one lowercase letter");
			});

			test("should reject passwords without numbers", () => {
				const result = PasswordPolicy.validateComplexity("Password!");
				expect(result.isValid).toBe(false);
				expect(result.errors).toContain("Password must contain at least one number");
			});

			test("should reject passwords without special characters", () => {
				const result = PasswordPolicy.validateComplexity("Password123");
				expect(result.isValid).toBe(false);
				expect(result.errors).toContain(
					"Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)"
				);
			});

			test("should accept passwords with all required complexity requirements", () => {
				const result = PasswordPolicy.validateComplexity("Password123!");
				expect(result.isValid).toBe(true);
				expect(result.errors).toHaveLength(0);
			});

			test("should accumulate multiple complexity errors", () => {
				const result = PasswordPolicy.validateComplexity("password");
				expect(result.isValid).toBe(false);
				expect(result.errors).toHaveLength(3);
				expect(result.errors).toContain("Password must contain at least one uppercase letter");
				expect(result.errors).toContain("Password must contain at least one number");
				expect(result.errors).toContain(
					"Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)"
				);
			});
		});

		describe("validateForbiddenPatterns", () => {
			test("should reject common passwords", () => {
				const commonPasswords = ["password", "Password123", "admin123", "qwerty123", "123456789"];

				commonPasswords.forEach(password => {
					const result = PasswordPolicy.validateForbiddenPatterns(password);
					expect(result.isValid).toBe(false);
					expect(result.errors).toContain("Password is too common and easily guessable");
				});
			});

			test("should reject passwords with sequential characters", () => {
				const sequentialPasswords = ["Password123456", "Password1234", "Passwordabcd", "PasswordABCD"];

				sequentialPasswords.forEach(password => {
					const result = PasswordPolicy.validateForbiddenPatterns(password);
					expect(result.isValid).toBe(false);
					expect(result.errors).toContain("Password contains sequential characters");
				});
			});

			test("should reject passwords with repeated characters", () => {
				const repeatedPasswords = ["Passwordaaa123!", "Password111!", "PasswordAAA123!"];

				repeatedPasswords.forEach(password => {
					const result = PasswordPolicy.validateForbiddenPatterns(password);
					expect(result.isValid).toBe(false);
					expect(result.errors).toContain("Password contains too many repeated characters");
				});
			});

			test("should reject passwords containing user information patterns", () => {
				const userInfo = {
					email: "john.doe@company.com",
					firstName: "John",
					lastName: "Doe"
				};

				const userBasedPasswords = [
					"JohnPassword123!",
					"DoePassword123!",
					"john.doePassword!",
					"CompanyPassword123!"
				];

				userBasedPasswords.forEach(password => {
					const result = PasswordPolicy.validateForbiddenPatterns(password, userInfo);
					expect(result.isValid).toBe(false);
					expect(result.errors).toContain("Password should not contain personal information");
				});
			});

			test("should accept passwords without forbidden patterns", () => {
				const result = PasswordPolicy.validateForbiddenPatterns("SecureP@ssw0rd2024");
				expect(result.isValid).toBe(true);
				expect(result.errors).toHaveLength(0);
			});
		});

		describe("calculatePasswordStrength", () => {
			test("should return very weak for simple passwords", () => {
				const result = PasswordPolicy.calculatePasswordStrength("password");
				expect(result.score).toBeLessThan(20);
				expect(result.strength).toBe("Very Weak");
			});

			test("should return weak for passwords with minimal requirements", () => {
				const result = PasswordPolicy.calculatePasswordStrength("Password1");
				expect(result.score).toBeGreaterThanOrEqual(20);
				expect(result.score).toBeLessThan(40);
				expect(result.strength).toBe("Weak");
			});

			test("should return fair for passwords with some complexity", () => {
				const result = PasswordPolicy.calculatePasswordStrength("Password123!");
				expect(result.score).toBeGreaterThanOrEqual(40);
				expect(result.score).toBeLessThan(60);
				expect(result.strength).toBe("Fair");
			});

			test("should return good for strong passwords", () => {
				const result = PasswordPolicy.calculatePasswordStrength("MySecure2024Password!");
				expect(result.score).toBeGreaterThanOrEqual(60);
				expect(result.score).toBeLessThan(80);
				expect(result.strength).toBe("Good");
			});

			test("should return excellent for very strong passwords", () => {
				const result = PasswordPolicy.calculatePasswordStrength("MyVerySecure2024P@ssw0rd!WithExtra$pecialChars");
				expect(result.score).toBeGreaterThanOrEqual(80);
				expect(result.strength).toBe("Excellent");
			});

			test("should provide helpful feedback for improvement", () => {
				const result = PasswordPolicy.calculatePasswordStrength("password");
				expect(result.feedback).toContain("Add uppercase letters");
				expect(result.feedback).toContain("Add numbers");
				expect(result.feedback).toContain("Add special characters");
			});
		});

		describe("validatePasswordReuse", () => {
			test("should reject passwords that match previous passwords", () => {
				const previousPasswords = ["OldPassword1!", "OldPassword2!", "OldPassword3!"];

				const result = PasswordPolicy.validatePasswordReuse("OldPassword1!", previousPasswords);
				expect(result.isValid).toBe(false);
				expect(result.errors).toContain("Password has been used recently and cannot be reused");
			});

			test("should reject passwords that are too similar to previous passwords", () => {
				const previousPasswords = ["MyPassword123!", "MyPassword456!", "MyPassword789!"];

				const result = PasswordPolicy.validatePasswordReuse("MyPassword000!", previousPasswords);
				expect(result.isValid).toBe(false);
				expect(result.errors).toContain("Password is too similar to a recently used password");
			});

			test("should accept passwords that are sufficiently different", () => {
				const previousPasswords = ["OldPassword123!", "PreviousPass456!", "FormerSecret789!"];

				const result = PasswordPolicy.validatePasswordReuse("NewSecurePassword2024!", previousPasswords);
				expect(result.isValid).toBe(true);
				expect(result.errors).toHaveLength(0);
			});

			test("should handle empty previous password list", () => {
				const result = PasswordPolicy.validatePasswordReuse("NewPassword123!", []);
				expect(result.isValid).toBe(true);
				expect(result.errors).toHaveLength(0);
			});
		});

		describe("validatePassword (comprehensive validation)", () => {
			test("should validate all password requirements together", () => {
				const options = {
					userInfo: {
						email: "test@example.com",
						firstName: "Test",
						lastName: "User"
					},
					previousPasswords: ["OldPassword123!"]
				};

				const result = PasswordPolicy.validatePassword("ValidNewP@ssw0rd2024", options);
				expect(result.isValid).toBe(true);
				expect(result.errors).toHaveLength(0);
				expect(result.strength).toBeDefined();
				expect(result.strength.score).toBeGreaterThan(0);
			});

			test("should accumulate all validation errors", () => {
				const options = {
					userInfo: {
						email: "test@example.com",
						firstName: "Test",
						lastName: "User"
					},
					previousPasswords: ["TestPassword123!"]
				};

				const result = PasswordPolicy.validatePassword("TestPassword123!", options);
				expect(result.isValid).toBe(false);
				expect(result.errors.length).toBeGreaterThan(0);
				expect(result.errors).toContain("Password has been used recently and cannot be reused");
				expect(result.errors).toContain("Password should not contain personal information");
			});

			test("should work with minimal options", () => {
				const result = PasswordPolicy.validatePassword("ValidP@ssw0rd123");
				expect(result.isValid).toBe(true);
				expect(result.errors).toHaveLength(0);
				expect(result.strength).toBeDefined();
			});

			test("should reject passwords failing multiple criteria", () => {
				const result = PasswordPolicy.validatePassword("weak");
				expect(result.isValid).toBe(false);
				expect(result.errors.length).toBeGreaterThanOrEqual(4);
			});
		});
	});

	// ============= INTEGRATION TESTS =============
	describe("Integration Scenarios", () => {
		it("should provide consistent validation approach across utilities", () => {
			// Test that both validation and password utilities follow same error patterns
			expect(() => validateString(null, "test", { required: true })).toThrow(ValidationError);
			
			const passwordResult = PasswordPolicy.validateLength("short");
			expect(passwordResult.isValid).toBe(false);
			expect(passwordResult.errors).toBeDefined();
		});

		it("should handle complex login validation with password strength", () => {
			const email = "test@example.com";
			const password = "StrongP@ssw0rd2024!";

			// Validate login form
			const loginResult = validateLoginForm(email, password);
			expect(loginResult.isValid).toBe(true);

			// Check password strength
			const strengthResult = PasswordPolicy.calculatePasswordStrength(password);
			expect(strengthResult.strength).toMatch(/Good|Excellent/);
		});

		it("should sanitize input and validate email together", () => {
			const maliciousEmail = "test@example.com<script>alert('xss')</script>";
			const sanitized = sanitizeInput(maliciousEmail);
			
			// Should remove script but preserve email
			expect(sanitized).toBe("test@example.com");
			expect(isValidEmail(sanitized)).toBe(true);
		});

		it("should provide comprehensive user registration validation", () => {
			const userInfo = {
				email: "user@example.com",
				firstName: "John",
				lastName: "Doe"
			};

			// Validate email
			const validatedEmail = validateEmail(userInfo.email);
			expect(validatedEmail).toBe("user@example.com");

			// Validate password with user info context
			const passwordResult = PasswordPolicy.validatePassword("SecureP@ssw0rd2024!", {
				userInfo,
				previousPasswords: []
			});
			
			expect(passwordResult.isValid).toBe(true);
			expect(passwordResult.strength.strength).toMatch(/Good|Excellent/);
		});
	});

	// ============= ERROR HANDLING AND EDGE CASES =============
	describe("Error Handling", () => {
		it("should handle null/undefined inputs gracefully across all functions", () => {
			expect(() => validateString(null, "test", { required: true })).toThrow(ValidationError);
			expect(() => validateEmail(null)).toThrow(ValidationError);
			expect(() => validatePositiveInteger(null, "test")).toThrow(ValidationError);
			expect(() => validateDate(null, "test")).toThrow(ValidationError);
			
			expect(sanitizeInput(null as unknown as string)).toBe("");
			expect(isValidReturnUrl(null as unknown as string, "https://example.com")).toBe(false);
		});

		it("should provide safe defaults for invalid inputs", () => {
			expect(sanitizeInput("")).toBe("");
			expect(isValidEmail("")).toBe(false);
			expect(isValidReturnUrl("", "https://example.com")).toBe(false);
			
			const emptyPasswordResult = PasswordPolicy.validateLength("");
			expect(emptyPasswordResult.isValid).toBe(false);
		});

		it("should maintain consistent error message formats", () => {
			try {
				validateString(null, "testField", { required: true });
			} catch (error) {
				expect(error instanceof ValidationError).toBe(true);
				expect((error as ValidationError).field).toBe("testField");
				expect((error as ValidationError).message).toContain("testField");
			}
		});
	});
});