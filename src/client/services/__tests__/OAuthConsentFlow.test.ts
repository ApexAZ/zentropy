import { vi, describe, it, expect, beforeEach } from "vitest";
import { OAuthProviderService } from "../OAuthProviderService";
import type { OAuthConsentRequest, AuthResponse, OAuthConsentResponse } from "../../types";

// Mock fetch globally
global.fetch = vi.fn();

describe("OAuth Consent Flow", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("processOAuth - Authentication with Consent Detection", () => {
		it("should return regular auth response when no consent required", async () => {
			const mockAuthResponse: AuthResponse = {
				access_token: "auth-token-123",
				token_type: "Bearer",
				user: {
					first_name: "John",
					last_name: "Doe",
					display_name: "John Doe",
					email: "john@example.com",
					has_projects_access: true,
					email_verified: true
				},
				action: "sign_in"
			};

			(fetch as any).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockAuthResponse)
			});

			const result = await OAuthProviderService.processOAuth({
				provider: "google",
				credential: "google-credential-token"
			});

			expect(result).toEqual(mockAuthResponse);
			expect(OAuthProviderService.isConsentRequired(result)).toBe(false);
			expect(fetch).toHaveBeenCalledWith("/api/v1/auth/oauth", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					provider: "google",
					credential: "google-credential-token"
				})
			});
		});

		it("should return consent response when consent required", async () => {
			const mockConsentResponse: OAuthConsentResponse = {
				action: "consent_required",
				provider: "google",
				existing_email: "john@example.com",
				provider_display_name: "Google",
				security_context: {
					existing_auth_method: "email_password",
					provider_email_verified: true
				}
			};

			(fetch as any).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockConsentResponse)
			});

			const result = await OAuthProviderService.processOAuth({
				provider: "google",
				credential: "google-credential-token"
			});

			expect(result).toEqual(mockConsentResponse);
			expect(OAuthProviderService.isConsentRequired(result)).toBe(true);
		});

		it("should handle Microsoft OAuth with authorization code", async () => {
			const mockAuthResponse: AuthResponse = {
				access_token: "auth-token-456",
				token_type: "Bearer",
				user: {
					first_name: "Jane",
					last_name: "Smith",
					display_name: "Jane Smith",
					email: "jane@company.com",
					has_projects_access: true,
					email_verified: true
				},
				action: "account_linked"
			};

			(fetch as any).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockAuthResponse)
			});

			const result = await OAuthProviderService.processOAuth({
				provider: "microsoft",
				authorization_code: "microsoft-auth-code"
			});

			expect(result).toEqual(mockAuthResponse);
			expect(fetch).toHaveBeenCalledWith("/api/v1/auth/oauth", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					provider: "microsoft",
					authorization_code: "microsoft-auth-code"
				})
			});
		});

		it("should handle GitHub OAuth with authorization code", async () => {
			const mockConsentResponse: OAuthConsentResponse = {
				action: "consent_required",
				provider: "github",
				existing_email: "developer@startup.com",
				provider_display_name: "GitHub",
				security_context: {
					existing_auth_method: "google_oauth",
					provider_email_verified: true
				}
			};

			(fetch as any).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockConsentResponse)
			});

			const result = await OAuthProviderService.processOAuth({
				provider: "github",
				authorization_code: "github-auth-code"
			});

			expect(result).toEqual(mockConsentResponse);
			expect(OAuthProviderService.isConsentRequired(result)).toBe(true);
		});

		it("should throw error for invalid provider OAuth request", async () => {
			await expect(
				OAuthProviderService.processOAuth({
					provider: "google"
					// Missing credential
				})
			).rejects.toThrow("Invalid OAuth request for provider: google");

			await expect(
				OAuthProviderService.processOAuth({
					provider: "microsoft"
					// Missing authorization_code
				})
			).rejects.toThrow("Invalid OAuth request for provider: microsoft");
		});

		it("should handle API errors during OAuth processing", async () => {
			(fetch as any).mockResolvedValueOnce({
				ok: false,
				status: 400,
				statusText: "Bad Request",
				json: () =>
					Promise.resolve({
						detail: "Invalid OAuth credential"
					})
			});

			await expect(
				OAuthProviderService.processOAuth({
					provider: "google",
					credential: "invalid-credential"
				})
			).rejects.toThrow("Invalid OAuth credential");
		});

		it("should handle network errors during OAuth processing", async () => {
			(fetch as any).mockResolvedValueOnce({
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
				json: () =>
					Promise.resolve({
						message: "Server temporarily unavailable"
					})
			});

			await expect(
				OAuthProviderService.processOAuth({
					provider: "google",
					credential: "some-credential"
				})
			).rejects.toThrow("Server temporarily unavailable");
		});
	});

	describe("processOAuthConsent - Consent Decision Processing", () => {
		it("should process consent acceptance (link accounts)", async () => {
			const mockAuthResponse: AuthResponse = {
				access_token: "linked-token-789",
				token_type: "Bearer",
				user: {
					first_name: "John",
					last_name: "Doe",
					display_name: "John Doe",
					email: "john@example.com",
					has_projects_access: true,
					email_verified: true
				},
				action: "account_linked"
			};

			(fetch as any).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockAuthResponse)
			});

			const consentRequest: OAuthConsentRequest = {
				provider: "google",
				credential: "google-credential-token",
				consent_given: true
			};

			const result = await OAuthProviderService.processOAuthConsent(consentRequest);

			expect(result).toEqual(mockAuthResponse);
			expect(fetch).toHaveBeenCalledWith("/api/v1/auth/oauth/consent", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: expect.stringContaining('"provider":"google"')
			});
		});

		it("should process consent rejection (separate accounts)", async () => {
			const mockAuthResponse: AuthResponse = {
				access_token: "separate-token-456",
				token_type: "Bearer",
				user: {
					first_name: "John",
					last_name: "Doe",
					display_name: "John Doe",
					email: "john@example.com",
					has_projects_access: true,
					email_verified: true
				},
				action: "sign_in"
			};

			(fetch as any).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockAuthResponse)
			});

			const consentRequest: OAuthConsentRequest = {
				provider: "microsoft",
				authorization_code: "microsoft-auth-code",
				consent_given: false
			};

			const result = await OAuthProviderService.processOAuthConsent(consentRequest);

			expect(result).toEqual(mockAuthResponse);
			expect(fetch).toHaveBeenCalledWith("/api/v1/auth/oauth/consent", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: expect.stringContaining('"provider":"microsoft"')
			});
		});

		it("should handle consent processing errors", async () => {
			(fetch as any).mockResolvedValueOnce({
				ok: false,
				status: 400,
				statusText: "Bad Request",
				json: () =>
					Promise.resolve({
						detail: "Consent decision expired"
					})
			});

			const consentRequest: OAuthConsentRequest = {
				provider: "github",
				authorization_code: "expired-code",
				consent_given: true
			};

			await expect(OAuthProviderService.processOAuthConsent(consentRequest)).rejects.toThrow(
				"Consent decision expired"
			);
		});

		it("should throw error for invalid consent request", async () => {
			const invalidRequest: OAuthConsentRequest = {
				provider: "google",
				// Missing credential AND authorization_code
				consent_given: true
			};

			await expect(OAuthProviderService.processOAuthConsent(invalidRequest)).rejects.toThrow(
				"Invalid OAuth consent request for provider: google"
			);
		});
	});

	describe("isConsentRequired - Type Guard", () => {
		it("should correctly identify consent required response", () => {
			const consentResponse: OAuthConsentResponse = {
				action: "consent_required",
				provider: "google",
				existing_email: "test@example.com",
				provider_display_name: "Google",
				security_context: {
					existing_auth_method: "email_password",
					provider_email_verified: true
				}
			};

			expect(OAuthProviderService.isConsentRequired(consentResponse)).toBe(true);
		});

		it("should correctly identify regular auth response", () => {
			const authResponse: AuthResponse = {
				access_token: "token-123",
				token_type: "Bearer",
				user: {
					first_name: "Test",
					last_name: "User",
					display_name: "Test User",
					email: "test@example.com",
					has_projects_access: true,
					email_verified: true
				},
				action: "sign_in"
			};

			expect(OAuthProviderService.isConsentRequired(authResponse)).toBe(false);
		});

		it("should handle edge cases gracefully", () => {
			// Missing action field
			const malformedResponse = {
				provider: "google",
				existing_email: "test@example.com"
			} as any;

			expect(OAuthProviderService.isConsentRequired(malformedResponse)).toBe(false);

			// Wrong action value
			const wrongActionResponse = {
				action: "sign_in",
				provider: "google"
			} as any;

			expect(OAuthProviderService.isConsentRequired(wrongActionResponse)).toBe(false);
		});
	});
});
