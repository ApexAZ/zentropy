import { describe, test, expect, beforeEach } from "vitest";
import { PasswordService } from "./password-service";

describe("PasswordService", () => {
	let passwordService: PasswordService;
	const VALID_PASSWORD = "SecureP@ssw0rd2024";
	const ANOTHER_VALID_PASSWORD = "Str0ngP@ssw0rd!";
	const THIRD_VALID_PASSWORD = "C0mplexSecure#Pass";

	beforeEach(() => {
		passwordService = new PasswordService();
	});

	describe("hashPassword", () => {
		test("should hash passwords securely", async () => {
			const hash = await passwordService.hashPassword(VALID_PASSWORD);

			expect(hash).toBeDefined();
			expect(typeof hash).toBe("string");
			expect(hash).not.toBe(VALID_PASSWORD);
			expect(hash.length).toBeGreaterThan(50);
		});

		test("should generate different hashes for the same password", async () => {
			const hash1 = await passwordService.hashPassword(VALID_PASSWORD);
			const hash2 = await passwordService.hashPassword(VALID_PASSWORD);

			expect(hash1).not.toBe(hash2);
		});

		test("should use appropriate salt rounds (10+)", async () => {
			const hash = await passwordService.hashPassword(VALID_PASSWORD);

			expect(hash.startsWith("$2b$")).toBe(true);
			const saltRounds = parseInt(hash.split("$")[2]);
			expect(saltRounds).toBeGreaterThanOrEqual(10);
		});

		test("should handle empty password", async () => {
			await expect(passwordService.hashPassword("")).rejects.toThrow("Password cannot be empty");
		});

		test("should handle null or undefined password", async () => {
			await expect(passwordService.hashPassword(null as any)).rejects.toThrow("Password must be a string");
			await expect(passwordService.hashPassword(undefined as any)).rejects.toThrow("Password must be a string");
		});

		test("should handle very long passwords", async () => {
			const longPassword = VALID_PASSWORD.repeat(10).substring(0, 200);
			await expect(passwordService.hashPassword(longPassword)).rejects.toThrow("Password validation failed");
		});
	});

	describe("verifyPassword", () => {
		test("should verify correct passwords", async () => {
			const hash = await passwordService.hashPassword(VALID_PASSWORD);

			const isValid = await passwordService.verifyPassword(VALID_PASSWORD, hash);
			expect(isValid).toBe(true);
		});

		test("should reject incorrect passwords", async () => {
			const hash = await passwordService.hashPassword(VALID_PASSWORD);

			const isValid = await passwordService.verifyPassword(ANOTHER_VALID_PASSWORD, hash);
			expect(isValid).toBe(false);
		});

		test("should handle case-sensitive verification", async () => {
			const hash = await passwordService.hashPassword(VALID_PASSWORD);
			const wrongCasePassword = VALID_PASSWORD.toLowerCase();

			const isValid = await passwordService.verifyPassword(wrongCasePassword, hash);
			expect(isValid).toBe(false);
		});

		test("should handle whitespace sensitivity", async () => {
			const hash = await passwordService.hashPassword(VALID_PASSWORD);
			const paddedPassword = ` ${VALID_PASSWORD} `;

			const isValid = await passwordService.verifyPassword(paddedPassword, hash);
			expect(isValid).toBe(false);
		});

		test("should handle empty password verification", async () => {
			const hash = await passwordService.hashPassword(VALID_PASSWORD);
			await expect(passwordService.verifyPassword("", hash)).rejects.toThrow("Password cannot be empty");
		});

		test("should handle invalid hash format", async () => {
			const invalidHash = "invalid_hash_format";

			await expect(passwordService.verifyPassword(VALID_PASSWORD, invalidHash)).rejects.toThrow(
				"Invalid hash format"
			);
		});

		test("should handle null or undefined inputs", async () => {
			const hash = await passwordService.hashPassword(VALID_PASSWORD);

			await expect(passwordService.verifyPassword(null as any, hash)).rejects.toThrow(
				"Password must be a string"
			);
			await expect(passwordService.verifyPassword(VALID_PASSWORD, null as any)).rejects.toThrow(
				"Hash must be a string"
			);
		});
	});

	describe("isValidHash", () => {
		test("should identify valid bcrypt hashes", async () => {
			const hash = await passwordService.hashPassword(VALID_PASSWORD);

			const isValid = passwordService.isValidHash(hash);
			expect(isValid).toBe(true);
		});

		test("should reject invalid hash formats", () => {
			const invalidHashes = [
				"",
				"invalid_hash",
				"$2a$10$",
				"md5_hash_format",
				"plain_text_password",
				null,
				undefined
			];

			invalidHashes.forEach(hash => {
				const isValid = passwordService.isValidHash(hash as any);
				expect(isValid).toBe(false);
			});
		});

		test("should identify bcrypt hash versions", async () => {
			const hash = await passwordService.hashPassword(VALID_PASSWORD);

			expect(hash.startsWith("$2b$")).toBe(true);
			expect(passwordService.isValidHash(hash)).toBe(true);
		});
	});

	describe("getSaltRounds", () => {
		test("should extract salt rounds from hash", async () => {
			const hash = await passwordService.hashPassword(VALID_PASSWORD);

			const saltRounds = passwordService.getSaltRounds(hash);
			expect(saltRounds).toBeGreaterThanOrEqual(10);
			expect(typeof saltRounds).toBe("number");
		});

		test("should handle invalid hash format for salt rounds", () => {
			expect(() => passwordService.getSaltRounds("invalid_hash")).toThrow("Invalid hash format");
		});
	});

	describe("passwordComplexity", () => {
		test("should validate password policy before hashing", async () => {
			const weakPassword = "weak";
			await expect(passwordService.hashPassword(weakPassword)).rejects.toThrow();
		});

		test("should allow strong passwords", async () => {
			const hash = await passwordService.hashPassword(VALID_PASSWORD);
			expect(hash).toBeDefined();
		});
	});

	describe("performance and security", () => {
		test("should take reasonable time to hash (security vs performance)", async () => {
			const startTime = Date.now();

			await passwordService.hashPassword(VALID_PASSWORD);

			const duration = Date.now() - startTime;
			expect(duration).toBeGreaterThan(50);
			expect(duration).toBeLessThan(2000);
		});

		test("should handle concurrent hashing operations", async () => {
			const promises = Array.from({ length: 5 }, () => passwordService.hashPassword(VALID_PASSWORD));

			const hashes = await Promise.all(promises);

			expect(hashes).toHaveLength(5);
			hashes.forEach(hash => {
				expect(hash).toBeDefined();
				expect(typeof hash).toBe("string");
			});

			const uniqueHashes = new Set(hashes);
			expect(uniqueHashes.size).toBe(5);
		});

		test("should handle concurrent verification operations", async () => {
			const hash = await passwordService.hashPassword(VALID_PASSWORD);

			const promises = Array.from({ length: 5 }, () => passwordService.verifyPassword(VALID_PASSWORD, hash));

			const results = await Promise.all(promises);
			results.forEach(result => {
				expect(result).toBe(true);
			});
		});
	});

	describe("edge cases", () => {
		test("should handle passwords with special unicode characters", async () => {
			const unicodePassword = "Pässwörd123!🔒";
			const hash = await passwordService.hashPassword(unicodePassword);

			const isValid = await passwordService.verifyPassword(unicodePassword, hash);
			expect(isValid).toBe(true);
		});

		test("should handle very short valid passwords", async () => {
			const shortPassword = "Short1!";
			await expect(passwordService.hashPassword(shortPassword)).rejects.toThrow();
		});

		test("should handle maximum length passwords", async () => {
			const maxPassword = "MySecure2024P@ssw0rd!" + "A".repeat(107);
			await expect(passwordService.hashPassword(maxPassword)).rejects.toThrow("Password validation failed");
		});
	});
});
