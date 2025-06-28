import { describe, test, expect } from "vitest";
import { PasswordPolicy } from "../../utils/password-policy";

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
