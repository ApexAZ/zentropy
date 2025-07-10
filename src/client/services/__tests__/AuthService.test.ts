import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { AuthService } from "../AuthService";
import type { SignInCredentials, SignUpData, AuthResponse } from "../../types";

// Mock fetch globally
global.fetch = vi.fn();

describe("AuthService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Clear storage before each test
		localStorage.clear();
		sessionStorage.clear();
	});

	afterEach(() => {
		// Clean up storage after each test
		localStorage.clear();
		sessionStorage.clear();
	});

	describe("signIn", () => {
		const mockCredentials: SignInCredentials = {
			email: "test@example.com",
			password: "password123",
			remember_me: true
		};

		const mockAuthResponse: AuthResponse = {
			access_token: "mock-token-123",
			token_type: "Bearer",
			user: {
				first_name: "John",
				last_name: "Doe",
				email: "test@example.com",
				has_projects_access: true,
				email_verified: true
			}
		};

		it("should sign in successfully with valid credentials", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockAuthResponse)
			} as Response);

			const result = await AuthService.signIn(mockCredentials);

			expect(result).toEqual({
				token: "mock-token-123",
				user: {
					email: "test@example.com",
					name: "John Doe",
					has_projects_access: true,
					email_verified: true
				}
			});

			expect(fetch).toHaveBeenCalledWith("/api/v1/auth/login-json", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify(mockCredentials)
			});
		});

		it("should handle API error with detail message", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 401,
				json: () => Promise.resolve({ detail: "Invalid credentials" })
			} as Response);

			await expect(AuthService.signIn(mockCredentials)).rejects.toThrow("Invalid credentials");
		});

		it("should handle API error with fallback message", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 500,
				json: () => Promise.resolve({})
			} as Response);

			await expect(AuthService.signIn(mockCredentials)).rejects.toThrow("Login failed");
		});

		it("should handle network errors", async () => {
			vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

			await expect(AuthService.signIn(mockCredentials)).rejects.toThrow("Network error");
		});

		it("should handle malformed JSON response", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				json: () => Promise.reject(new Error("Invalid JSON"))
			} as Response);

			await expect(AuthService.signIn(mockCredentials)).rejects.toThrow("Invalid JSON");
		});
	});

	describe("signUp", () => {
		const mockSignUpData: SignUpData = {
			first_name: "Jane",
			last_name: "Smith",
			email: "jane@example.com",
			password: "SecurePass123!",
			terms_agreement: true,
			has_projects_access: false
		};

		const mockAuthResponse: AuthResponse = {
			access_token: "new-user-token-456",
			token_type: "Bearer",
			user: {
				first_name: "Jane",
				last_name: "Smith",
				email: "jane@example.com",
				has_projects_access: false,
				email_verified: false
			}
		};

		it("should sign up successfully with valid data", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockAuthResponse)
			} as Response);

			const result = await AuthService.signUp(mockSignUpData);

			expect(result).toEqual({
				token: "new-user-token-456",
				user: {
					email: "jane@example.com",
					name: "Jane Smith",
					has_projects_access: false,
					email_verified: false
				}
			});

			expect(fetch).toHaveBeenCalledWith("/api/v1/auth/register", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify(mockSignUpData)
			});
		});

		it("should include organization_id when provided", async () => {
			const signUpDataWithOrg: SignUpData = {
				...mockSignUpData,
				organization_id: "org-123"
			};

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockAuthResponse)
			} as Response);

			await AuthService.signUp(signUpDataWithOrg);

			expect(fetch).toHaveBeenCalledWith("/api/v1/auth/register", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify(signUpDataWithOrg)
			});
		});

		it("should handle validation errors", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 400,
				json: () => Promise.resolve({ detail: "Email already exists" })
			} as Response);

			await expect(AuthService.signUp(mockSignUpData)).rejects.toThrow("Email already exists");
		});

		it("should handle registration failure with fallback message", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 500,
				json: () => Promise.resolve({})
			} as Response);

			await expect(AuthService.signUp(mockSignUpData)).rejects.toThrow("Registration failed");
		});
	});

	describe("oauthSignIn", () => {
		const mockCredential = "mock-google-credential-token";
		const mockAuthResponse: AuthResponse = {
			access_token: "oauth-token-789",
			token_type: "Bearer",
			user: {
				first_name: "OAuth",
				last_name: "User",
				email: "oauth@example.com",
				has_projects_access: true,
				email_verified: true
			}
		};

		it("should sign in with Google OAuth successfully", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockAuthResponse)
			} as Response);

			const result = await AuthService.oauthSignIn("google", mockCredential);

			expect(result).toEqual({
				token: "oauth-token-789",
				user: {
					email: "oauth@example.com",
					name: "OAuth User",
					has_projects_access: true,
					email_verified: true
				}
			});

			expect(fetch).toHaveBeenCalledWith("/api/v1/auth/google-oauth", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					credential: mockCredential
				})
			});
		});


		it("should reject unsupported OAuth providers", async () => {
			await expect(AuthService.oauthSignIn("facebook" as any, mockCredential)).rejects.toThrow(
				"Only Google OAuth is currently supported"
			);

			// Verify no API call was made
			expect(fetch).not.toHaveBeenCalled();
		});

		it("should handle OAuth authentication errors", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 400,
				json: () => Promise.resolve({ detail: "Invalid OAuth credential" })
			} as Response);

			await expect(AuthService.oauthSignIn("google", mockCredential)).rejects.toThrow("Invalid OAuth credential");
		});

		it("should handle OAuth failure with fallback message", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 500,
				json: () => Promise.resolve({})
			} as Response);

			await expect(AuthService.oauthSignIn("google", mockCredential)).rejects.toThrow(
				"OAuth authentication failed"
			);
		});
	});

	describe("signOut", () => {
		it("should clear tokens from localStorage", async () => {
			// Set tokens in storage
			localStorage.setItem("authToken", "local-token");
			sessionStorage.setItem("authToken", "session-token");

			await AuthService.signOut();

			expect(localStorage.getItem("authToken")).toBeNull();
			expect(sessionStorage.getItem("authToken")).toBeNull();
		});

		it("should handle empty storage gracefully", async () => {
			// No tokens in storage
			expect(() => AuthService.signOut()).not.toThrow();
		});
	});

	describe("validateEmail", () => {
		it("should validate correct email formats", () => {
			const validEmails = [
				"test@example.com",
				"user.name@domain.co.uk",
				"first.last+tag@subdomain.example.org",
				"user_name@example-domain.com"
			];

			validEmails.forEach(email => {
				expect(AuthService.validateEmail(email)).toBe(true);
			});
		});

		it("should invalidate incorrect email formats", () => {
			const invalidEmails = [
				"invalid-email",
				"@example.com",
				"user@",
				"user@@example.com",
				"user space@example.com",
				"user@.com",
				"user@domain",
				""
			];

			invalidEmails.forEach(email => {
				expect(AuthService.validateEmail(email)).toBe(false);
			});
		});
	});

	describe("sendEmailVerification", () => {
		const testEmail = "verify@example.com";

		it("should send verification email successfully", async () => {
			const mockResponse = { message: "Verification email sent successfully" };

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockResponse)
			} as Response);

			const result = await AuthService.sendEmailVerification(testEmail);

			expect(result).toEqual({ message: "Verification email sent successfully" });

			expect(fetch).toHaveBeenCalledWith("/api/v1/auth/send-verification", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({ email: testEmail })
			});
		});

		it("should provide fallback message when API response lacks message", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({})
			} as Response);

			const result = await AuthService.sendEmailVerification(testEmail);

			expect(result.message).toBe("Verification email sent! Please check your inbox.");
		});

		it("should handle verification errors", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 400,
				json: () => Promise.resolve({ detail: "Email already verified" })
			} as Response);

			await expect(AuthService.sendEmailVerification(testEmail)).rejects.toThrow("Email already verified");
		});

		it("should handle verification failure with fallback message", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 500,
				json: () => Promise.resolve({})
			} as Response);

			await expect(AuthService.sendEmailVerification(testEmail)).rejects.toThrow(
				"Failed to send verification email"
			);
		});

		it("should handle network errors during verification", async () => {
			vi.mocked(fetch).mockRejectedValueOnce(new Error("Network timeout"));

			await expect(AuthService.sendEmailVerification(testEmail)).rejects.toThrow("Network timeout");
		});
	});
});

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
