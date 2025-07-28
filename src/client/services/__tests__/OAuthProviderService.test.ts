import { vi, describe, it, expect, beforeEach } from "vitest";
import { OAuthProviderService, OAuthProviders } from "../OAuthProviderService";
import type { LinkOAuthProviderRequest, UnlinkOAuthProviderRequest } from "../../types";

// Mock createAuthHeaders
vi.mock("../../utils/auth", () => ({
	createAuthHeaders: vi.fn(() => ({ Authorization: "Bearer mock-token" }))
}));

// Mock fetch globally

global.fetch = vi.fn();

describe("OAuthProviderService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Provider Registry", () => {
		it("should return available OAuth providers", () => {
			const providers = OAuthProviderService.getAvailableProviders();

			expect(providers).toHaveLength(3);
			expect(providers).toEqual(
				expect.arrayContaining([
					{
						name: "google",
						displayName: "Google",
						iconClass: "fab fa-google",
						brandColor: "#4285f4"
					},
					{
						name: "microsoft",
						displayName: "Microsoft",
						iconClass: "fab fa-microsoft",
						brandColor: "#0078d4"
					},
					{
						name: "github",
						displayName: "GitHub",
						iconClass: "fab fa-github",
						brandColor: "#333"
					}
				])
			);
		});

		// Test provider retrieval with parameterized data
		const providerTestCases = [
			{
				name: "google",
				expected: {
					name: "google",
					displayName: "Google",
					iconClass: "fab fa-google",
					brandColor: "#4285f4"
				}
			},
			{
				name: "microsoft",
				expected: {
					name: "microsoft",
					displayName: "Microsoft",
					iconClass: "fab fa-microsoft",
					brandColor: "#0078d4"
				}
			},
			{
				name: "github",
				expected: {
					name: "github",
					displayName: "GitHub",
					iconClass: "fab fa-github",
					brandColor: "#333"
				}
			}
		];

		providerTestCases.forEach(({ name, expected }) => {
			it(`should get ${expected.displayName} provider by name`, () => {
				const provider = OAuthProviderService.getProvider(name);
				expect(provider).toEqual(expected);
			});
		});

		it("should return undefined for unknown provider", () => {
			const unknownProvider = OAuthProviderService.getProvider("unknown");
			expect(unknownProvider).toBeUndefined();
		});

		it("should check if provider is supported", () => {
			const supportedProviders = ["google", "microsoft", "github"];
			const unsupportedProviders = ["", "unknown", "invalid"];

			supportedProviders.forEach(provider => {
				expect(OAuthProviderService.isProviderSupported(provider)).toBe(true);
			});

			unsupportedProviders.forEach(provider => {
				expect(OAuthProviderService.isProviderSupported(provider)).toBe(false);
			});
		});

		// Test provider display information with the same parameterized data
		providerTestCases.forEach(({ name, expected }) => {
			it(`should get ${expected.displayName} provider display information`, () => {
				const displayInfo = OAuthProviderService.getProviderDisplayInfo(name);
				expect(displayInfo).toEqual({
					displayName: expected.displayName,
					iconClass: expected.iconClass,
					brandColor: expected.brandColor
				});
			});
		});

		it("should return null for unknown provider display info", () => {
			const displayInfo = OAuthProviderService.getProviderDisplayInfo("unknown");
			expect(displayInfo).toBeNull();
		});
	});

	describe("Request Validation", () => {
		describe("Link Request Validation", () => {
			it("should validate valid link request", () => {
				const request: LinkOAuthProviderRequest = {
					credential: "valid-credential",
					provider: "google"
				};

				const result = OAuthProviderService.validateLinkRequest(request);
				expect(result.isValid).toBe(true);
				expect(result.errors).toHaveLength(0);
			});

			it("should reject empty credential", () => {
				const request: LinkOAuthProviderRequest = {
					credential: "",
					provider: "google"
				};

				const result = OAuthProviderService.validateLinkRequest(request);
				expect(result.isValid).toBe(false);
				expect(result.errors).toContain("OAuth credential is required");
			});

			it("should reject whitespace-only credential", () => {
				const request: LinkOAuthProviderRequest = {
					credential: "   ",
					provider: "google"
				};

				const result = OAuthProviderService.validateLinkRequest(request);
				expect(result.isValid).toBe(false);
				expect(result.errors).toContain("OAuth credential is required");
			});

			it("should reject empty provider", () => {
				const request: LinkOAuthProviderRequest = {
					credential: "valid-credential",
					provider: ""
				};

				const result = OAuthProviderService.validateLinkRequest(request);
				expect(result.isValid).toBe(false);
				expect(result.errors).toContain("Provider name is required");
			});

			it("should reject unsupported provider", () => {
				const request: LinkOAuthProviderRequest = {
					credential: "valid-credential",
					provider: "unsupported"
				};

				const result = OAuthProviderService.validateLinkRequest(request);
				expect(result.isValid).toBe(false);
				expect(result.errors).toContain("Unsupported OAuth provider: unsupported");
			});

			it("should return multiple errors for invalid request", () => {
				const request: LinkOAuthProviderRequest = {
					credential: "",
					provider: "unsupported"
				};

				const result = OAuthProviderService.validateLinkRequest(request);
				expect(result.isValid).toBe(false);
				expect(result.errors).toHaveLength(2);
				expect(result.errors).toContain("OAuth credential is required");
				expect(result.errors).toContain("Unsupported OAuth provider: unsupported");
			});
		});

		describe("Unlink Request Validation", () => {
			it("should validate valid unlink request", () => {
				const request: UnlinkOAuthProviderRequest = {
					password: "valid-password",
					provider: "google"
				};

				const result = OAuthProviderService.validateUnlinkRequest(request);
				expect(result.isValid).toBe(true);
				expect(result.errors).toHaveLength(0);
			});

			it("should reject empty password", () => {
				const request: UnlinkOAuthProviderRequest = {
					password: "",
					provider: "google"
				};

				const result = OAuthProviderService.validateUnlinkRequest(request);
				expect(result.isValid).toBe(false);
				expect(result.errors).toContain("Password is required for security verification");
			});

			it("should reject whitespace-only password", () => {
				const request: UnlinkOAuthProviderRequest = {
					password: "   ",
					provider: "google"
				};

				const result = OAuthProviderService.validateUnlinkRequest(request);
				expect(result.isValid).toBe(false);
				expect(result.errors).toContain("Password is required for security verification");
			});

			it("should reject unsupported provider", () => {
				const request: UnlinkOAuthProviderRequest = {
					password: "valid-password",
					provider: "unsupported"
				};

				const result = OAuthProviderService.validateUnlinkRequest(request);
				expect(result.isValid).toBe(false);
				expect(result.errors).toContain("Unsupported OAuth provider: unsupported");
			});
		});
	});

	describe("OAuth Operations", () => {
		describe("Link Provider", () => {
			it("should link provider successfully", async () => {
				const mockResponse = {
					message: "Google account linked successfully"
				};

				(fetch as any).mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(mockResponse)
				});

				const request: LinkOAuthProviderRequest = {
					credential: "google-credential-token",
					provider: "google"
				};

				const result = await OAuthProviderService.linkProvider(request);

				// Test behavior: User should get success response with unified endpoint format
				expect(result.success).toBe(true);
				expect(result.provider).toBe("google");
				expect(result.message).toBe("Google account linked successfully");
				expect(result.provider_identifier).toBe(""); // Unified endpoint doesn't return provider-specific email
			});

			it("should handle API errors during linking", async () => {
				(fetch as any).mockResolvedValueOnce({
					ok: false,
					status: 400,
					statusText: "Bad Request",
					json: () =>
						Promise.resolve({
							detail: "Google email does not match account email"
						})
				});

				const request: LinkOAuthProviderRequest = {
					credential: "invalid-credential",
					provider: "google"
				};

				await expect(OAuthProviderService.linkProvider(request)).rejects.toThrow(
					"Google email does not match account email"
				);
			});

			it("should handle network errors during linking", async () => {
				(fetch as any).mockResolvedValueOnce({
					ok: false,
					status: 500,
					statusText: "Internal Server Error",
					json: () => Promise.reject(new Error("Network error"))
				});

				const request: LinkOAuthProviderRequest = {
					credential: "credential",
					provider: "google"
				};

				await expect(OAuthProviderService.linkProvider(request)).rejects.toThrow("Network error occurred");
			});

			it("should reject invalid link request", async () => {
				const request: LinkOAuthProviderRequest = {
					credential: "",
					provider: "google"
				};

				await expect(OAuthProviderService.linkProvider(request)).rejects.toThrow(
					"Invalid link request: OAuth credential is required"
				);
			});

			it("should successfully link Microsoft account and return success response", async () => {
				const mockResponse = {
					message: "Microsoft account linked successfully"
				};

				(fetch as any).mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(mockResponse)
				});

				const request: LinkOAuthProviderRequest = {
					credential: "microsoft-credential-token",
					provider: "microsoft"
				};

				const result = await OAuthProviderService.linkProvider(request);

				// Test behavior: User should get success response with unified endpoint format
				expect(result.success).toBe(true);
				expect(result.provider).toBe("microsoft");
				expect(result.message).toBe("Microsoft account linked successfully");
				expect(result.provider_identifier).toBe(""); // Unified endpoint doesn't return provider-specific email
			});

			it("should successfully link GitHub account and return success response", async () => {
				const mockResponse = {
					message: "GitHub account linked successfully"
				};

				(fetch as any).mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(mockResponse)
				});

				const request: LinkOAuthProviderRequest = {
					credential: "github-credential-token",
					provider: "github"
				};

				const result = await OAuthProviderService.linkProvider(request);

				// Test behavior: User should get success response with unified endpoint format
				expect(result.success).toBe(true);
				expect(result.provider).toBe("github");
				expect(result.message).toBe("GitHub account linked successfully");
				expect(result.provider_identifier).toBe(""); // Unified endpoint doesn't return provider-specific email
			});
		});

		describe("Unlink Provider", () => {
			it("should unlink provider successfully", async () => {
				const mockResponse = {
					message: "Google account unlinked successfully"
				};

				(fetch as any).mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(mockResponse)
				});

				const request: UnlinkOAuthProviderRequest = {
					password: "user-password",
					provider: "google"
				};

				const result = await OAuthProviderService.unlinkProvider(request);

				// Test behavior: User should get success confirmation after unlinking
				expect(result.success).toBe(true);
				expect(result.provider).toBe("google");
				expect(result.message).toBe("Google account unlinked successfully");
			});

			it("should handle API errors during unlinking", async () => {
				(fetch as any).mockResolvedValueOnce({
					ok: false,
					status: 400,
					statusText: "Bad Request",
					json: () =>
						Promise.resolve({
							detail: "Incorrect password"
						})
				});

				const request: UnlinkOAuthProviderRequest = {
					password: "wrong-password",
					provider: "google"
				};

				await expect(OAuthProviderService.unlinkProvider(request)).rejects.toThrow("Incorrect password");
			});

			it("should reject invalid unlink request", async () => {
				const request: UnlinkOAuthProviderRequest = {
					password: "",
					provider: "google"
				};

				await expect(OAuthProviderService.unlinkProvider(request)).rejects.toThrow(
					"Invalid unlink request: Password is required for security verification"
				);
			});

			it("should successfully unlink Microsoft account after password verification", async () => {
				const mockResponse = {
					message: "Microsoft account unlinked successfully"
				};

				(fetch as any).mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(mockResponse)
				});

				const request: UnlinkOAuthProviderRequest = {
					password: "user-password",
					provider: "microsoft"
				};

				const result = await OAuthProviderService.unlinkProvider(request);

				// Test behavior: User should get success confirmation after unlinking
				expect(result.success).toBe(true);
				expect(result.provider).toBe("microsoft");
				expect(result.message).toBe("Microsoft account unlinked successfully");
			});

			it("should handle Microsoft account linking errors gracefully", async () => {
				(fetch as any).mockResolvedValueOnce({
					ok: false,
					status: 400,
					statusText: "Bad Request",
					json: () =>
						Promise.resolve({
							detail: "Microsoft email does not match account email"
						})
				});

				const request: LinkOAuthProviderRequest = {
					credential: "invalid-microsoft-credential",
					provider: "microsoft"
				};

				// Test behavior: User should get meaningful error when Microsoft linking fails
				await expect(OAuthProviderService.linkProvider(request)).rejects.toThrow(
					"Microsoft email does not match account email"
				);
			});

			it("should handle Microsoft account unlinking errors gracefully", async () => {
				(fetch as any).mockResolvedValueOnce({
					ok: false,
					status: 400,
					statusText: "Bad Request",
					json: () =>
						Promise.resolve({
							detail: "No Microsoft account is linked to this account"
						})
				});

				const request: UnlinkOAuthProviderRequest = {
					password: "user-password",
					provider: "microsoft"
				};

				// Test behavior: User should get meaningful error when unlinking fails
				await expect(OAuthProviderService.unlinkProvider(request)).rejects.toThrow(
					"No Microsoft account is linked to this account"
				);
			});

			it("should successfully unlink GitHub account after password verification", async () => {
				const mockResponse = {
					message: "GitHub account unlinked successfully"
				};

				(fetch as any).mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(mockResponse)
				});

				const request: UnlinkOAuthProviderRequest = {
					password: "user-password",
					provider: "github"
				};

				const result = await OAuthProviderService.unlinkProvider(request);

				// Test behavior: User should get success confirmation after unlinking
				expect(result.success).toBe(true);
				expect(result.provider).toBe("github");
				expect(result.message).toBe("GitHub account unlinked successfully");
			});

			it("should handle GitHub account linking errors gracefully", async () => {
				(fetch as any).mockResolvedValueOnce({
					ok: false,
					status: 400,
					statusText: "Bad Request",
					json: () =>
						Promise.resolve({
							detail: "GitHub email does not match account email"
						})
				});

				const request: LinkOAuthProviderRequest = {
					credential: "invalid-github-credential",
					provider: "github"
				};

				// Test behavior: User should get meaningful error when GitHub linking fails
				await expect(OAuthProviderService.linkProvider(request)).rejects.toThrow(
					"GitHub email does not match account email"
				);
			});

			it("should handle GitHub account unlinking errors gracefully", async () => {
				(fetch as any).mockResolvedValueOnce({
					ok: false,
					status: 400,
					statusText: "Bad Request",
					json: () =>
						Promise.resolve({
							detail: "No GitHub account is linked to this account"
						})
				});

				const request: UnlinkOAuthProviderRequest = {
					password: "user-password",
					provider: "github"
				};

				// Test behavior: User should get meaningful error when unlinking fails
				await expect(OAuthProviderService.unlinkProvider(request)).rejects.toThrow(
					"No GitHub account is linked to this account"
				);
			});
		});
	});
});

describe("OAuthProviders Constants", () => {
	it("should export OAuth provider constants", () => {
		expect(OAuthProviders.GOOGLE).toBe("google");
		expect(OAuthProviders.MICROSOFT).toBe("microsoft");
		expect(OAuthProviders.GITHUB).toBe("github");
	});
});
