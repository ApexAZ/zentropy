import { describe, it, expect } from "vitest";
import { AuthService } from "../AuthService";

describe("AuthService.validatePassword", () => {
	describe("password requirements validation", () => {
		it("should validate password length requirement", () => {
			const shortPassword = "Aa1!";
			const validLength = "Aa1!5678";

			expect(AuthService.validatePassword(shortPassword).requirements.length).toBe(false);
			expect(AuthService.validatePassword(validLength).requirements.length).toBe(true);
		});

		it("should validate uppercase letter requirement", () => {
			const noUppercase = "aa1!5678";
			const hasUppercase = "Aa1!5678";

			expect(AuthService.validatePassword(noUppercase).requirements.uppercase).toBe(false);
			expect(AuthService.validatePassword(hasUppercase).requirements.uppercase).toBe(true);
		});

		it("should validate lowercase letter requirement", () => {
			const noLowercase = "AA1!5678";
			const hasLowercase = "Aa1!5678";

			expect(AuthService.validatePassword(noLowercase).requirements.lowercase).toBe(false);
			expect(AuthService.validatePassword(hasLowercase).requirements.lowercase).toBe(true);
		});

		it("should validate number requirement", () => {
			const noNumber = "AaB!cdef";
			const hasNumber = "Aa1!5678";

			expect(AuthService.validatePassword(noNumber).requirements.number).toBe(false);
			expect(AuthService.validatePassword(hasNumber).requirements.number).toBe(true);
		});

		it("should validate special character requirement", () => {
			const noSymbol = "Aa15678g";
			const hasSymbol = "Aa1!5678";

			expect(AuthService.validatePassword(noSymbol).requirements.symbol).toBe(false);
			expect(AuthService.validatePassword(hasSymbol).requirements.symbol).toBe(true);
		});

		it("should validate various special characters", () => {
			const specialChars = [
				"!",
				"@",
				"#",
				"$",
				"%",
				"^",
				"&",
				"*",
				"(",
				")",
				",",
				".",
				"?",
				'"',
				":",
				"{",
				"}",
				"|",
				"<",
				">"
			];

			specialChars.forEach(char => {
				const passwordWithChar = `Aa1${char}5678`;
				expect(AuthService.validatePassword(passwordWithChar).requirements.symbol).toBe(true);
			});
		});
	});

	describe("password matching validation", () => {
		it("should return false for match requirement when confirm password doesn't match", () => {
			const result = AuthService.validatePassword("Aa1!5678");
			expect(result.requirements.match).toBe(false);
		});

		it("should validate passwords match when confirm password provided", () => {
			const password = "Aa1!5678";
			const matchingConfirm = "Aa1!5678";
			const nonMatchingConfirm = "Aa1!5679";

			expect(AuthService.validatePassword(password, matchingConfirm).requirements.match).toBe(true);
			expect(AuthService.validatePassword(password, nonMatchingConfirm).requirements.match).toBe(false);
		});

		it("should handle empty confirm password", () => {
			const password = "Aa1!5678";
			const emptyConfirm = "";

			expect(AuthService.validatePassword(password, emptyConfirm).requirements.match).toBe(false);
		});

		it("should handle case-sensitive password matching", () => {
			const password = "Aa1!5678";
			const caseDifferent = "AA1!5678";

			expect(AuthService.validatePassword(password, caseDifferent).requirements.match).toBe(false);
		});
	});

	describe("overall password validation", () => {
		it("should return false for isValid when any requirement fails", () => {
			const invalidPasswords = [
				"short", // too short
				"nouppercase123!", // no uppercase
				"NOLOWERCASE123!", // no lowercase
				"NoNumbers!", // no numbers
				"NoSymbols123" // no symbols
			];

			invalidPasswords.forEach(password => {
				expect(AuthService.validatePassword(password).isValid).toBe(false);
			});
		});

		it("should return false for isValid when no confirm password provided", () => {
			const validPassword = "ValidPass123!";
			const result = AuthService.validatePassword(validPassword);

			expect(result.isValid).toBe(false); // Should fail because match is false
			expect(result.requirements.length).toBe(true);
			expect(result.requirements.uppercase).toBe(true);
			expect(result.requirements.lowercase).toBe(true);
			expect(result.requirements.number).toBe(true);
			expect(result.requirements.symbol).toBe(true);
			expect(result.requirements.match).toBe(false); // No confirm password = no match
		});

		it("should return false for isValid when passwords do not match", () => {
			const validPassword = "ValidPass123!";
			const nonMatchingConfirm = "ValidPass123@";

			const result = AuthService.validatePassword(validPassword, nonMatchingConfirm);
			expect(result.isValid).toBe(false);
		});

		it("should return true for isValid when all requirements pass including matching", () => {
			const validPassword = "ValidPass123!";
			const matchingConfirm = "ValidPass123!";

			const result = AuthService.validatePassword(validPassword, matchingConfirm);
			expect(result.isValid).toBe(true);
		});
	});

	describe("edge cases", () => {
		it("should handle empty password", () => {
			const result = AuthService.validatePassword("");

			expect(result.isValid).toBe(false);
			expect(result.requirements.length).toBe(false);
			expect(result.requirements.uppercase).toBe(false);
			expect(result.requirements.lowercase).toBe(false);
			expect(result.requirements.number).toBe(false);
			expect(result.requirements.symbol).toBe(false);
			expect(result.requirements.match).toBe(false);
		});

		it("should handle password with only spaces", () => {
			const result = AuthService.validatePassword("        ");

			expect(result.isValid).toBe(false);
			expect(result.requirements.length).toBe(true); // 8 spaces is 8 characters
			expect(result.requirements.uppercase).toBe(false);
			expect(result.requirements.lowercase).toBe(false);
			expect(result.requirements.number).toBe(false);
			expect(result.requirements.symbol).toBe(false);
		});

		it("should handle very long password", () => {
			const longPassword = "A".repeat(100) + "a1!";
			const result = AuthService.validatePassword(longPassword);

			expect(result.isValid).toBe(false); // False because no confirm password
			expect(result.requirements.length).toBe(true);
			expect(result.requirements.match).toBe(false); // No confirm password
		});

		it("should handle unicode characters", () => {
			const unicodePassword = "Pässwörd123!";
			const result = AuthService.validatePassword(unicodePassword);

			expect(result.requirements.length).toBe(true);
			expect(result.requirements.uppercase).toBe(true);
			expect(result.requirements.lowercase).toBe(true);
			expect(result.requirements.number).toBe(true);
			expect(result.requirements.symbol).toBe(true);
		});
	});
});
