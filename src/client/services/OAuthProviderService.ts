import type {
	OAuthProvider,
	LinkOAuthProviderRequest,
	UnlinkOAuthProviderRequest,
	OAuthOperationResponse,
	OAuthConsentCheckRequest,
	OAuthConsentCheckResponse,
	OAuthConsentResponse,
	OAuthConsentRequest,
	AuthResponse
} from "../types";
import { createAuthHeaders } from "../utils/auth";

/**
 * OAuth Provider Registry Service
 *
 * This service provides a future-ready abstraction for OAuth providers while
 * maintaining 100% compatibility with the existing Google OAuth implementation.
 *
 * CURRENT STATE: Enhances existing system without breaking changes
 * FUTURE STATE: Ready for multi-provider support (GitHub, Microsoft, etc.)
 */
export class OAuthProviderService {
	private static readonly PROVIDER_REGISTRY: Record<string, OAuthProvider> = {
		google: {
			name: "google",
			displayName: "Google",
			iconClass: "fab fa-google",
			brandColor: "#4285f4"
		},
		microsoft: {
			name: "microsoft",
			displayName: "Microsoft",
			iconClass: "fab fa-microsoft",
			brandColor: "#0078d4"
		},
		github: {
			name: "github",
			displayName: "GitHub",
			iconClass: "fab fa-github",
			brandColor: "#333"
		}
	};

	/**
	 * Get all available OAuth providers
	 * Currently returns Google, ready for future expansion
	 */
	static getAvailableProviders(): OAuthProvider[] {
		return Object.values(this.PROVIDER_REGISTRY);
	}

	/**
	 * Get provider metadata by name
	 */
	static getProvider(name: string): OAuthProvider | undefined {
		return this.PROVIDER_REGISTRY[name];
	}

	/**
	 * Check if a provider is supported
	 */
	static isProviderSupported(name: string): boolean {
		return name in this.PROVIDER_REGISTRY;
	}

	/**
	 * Get provider display information for UI
	 */
	static getProviderDisplayInfo(name: string): { displayName: string; iconClass: string; brandColor: string } | null {
		const provider = this.PROVIDER_REGISTRY[name];
		if (!provider) return null;

		return {
			displayName: provider.displayName,
			iconClass: provider.iconClass,
			brandColor: provider.brandColor
		};
	}

	/**
	 * Validate OAuth link request
	 * Ensures request is well-formed and provider is supported
	 */
	static validateLinkRequest(request: LinkOAuthProviderRequest): { isValid: boolean; errors: string[] } {
		const errors: string[] = [];

		if (!request.credential?.trim()) {
			errors.push("OAuth credential is required");
		}

		if (!request.provider?.trim()) {
			errors.push("Provider name is required");
		} else if (!this.isProviderSupported(request.provider)) {
			errors.push(`Unsupported OAuth provider: ${request.provider}`);
		}

		return {
			isValid: errors.length === 0,
			errors
		};
	}

	/**
	 * Validate OAuth unlink request
	 * Ensures request is well-formed and provider is supported
	 */
	static validateUnlinkRequest(request: UnlinkOAuthProviderRequest): { isValid: boolean; errors: string[] } {
		const errors: string[] = [];

		if (!request.password?.trim()) {
			errors.push("Password is required for security verification");
		}

		if (!request.provider?.trim()) {
			errors.push("Provider name is required");
		} else if (!this.isProviderSupported(request.provider)) {
			errors.push(`Unsupported OAuth provider: ${request.provider}`);
		}

		return {
			isValid: errors.length === 0,
			errors
		};
	}

	/**
	 * Generic link provider method
	 * Routes to provider-specific implementations based on provider name
	 */
	static async linkProvider(request: LinkOAuthProviderRequest): Promise<OAuthOperationResponse> {
		// Validate request first
		const validation = this.validateLinkRequest(request);
		if (!validation.isValid) {
			throw new Error(`Invalid link request: ${validation.errors.join(", ")}`);
		}

		// Route based on provider
		switch (request.provider) {
			case "google":
				return this.linkGoogleProvider(request);
			case "microsoft":
				return this.linkMicrosoftProvider(request);
			case "github":
				return this.linkGitHubProvider(request);
			default:
				throw new Error(`Unsupported provider: ${request.provider}`);
		}
	}

	/**
	 * Link Google provider using unified endpoint
	 */
	private static async linkGoogleProvider(request: LinkOAuthProviderRequest): Promise<OAuthOperationResponse> {
		const response = await fetch("/api/v1/users/me/link-oauth", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...createAuthHeaders()
			},
			body: JSON.stringify({
				provider: request.provider,
				credential: request.credential
			})
		});

		const result = await this.handleResponse<{ message: string }>(response);

		return {
			message: result.message,
			success: true,
			provider: request.provider,
			provider_identifier: "" // Unified endpoint doesn't return provider-specific email
		};
	}

	/**
	 * Link Microsoft provider using unified endpoint
	 */
	private static async linkMicrosoftProvider(request: LinkOAuthProviderRequest): Promise<OAuthOperationResponse> {
		const response = await fetch("/api/v1/users/me/link-oauth", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...createAuthHeaders()
			},
			body: JSON.stringify({
				provider: request.provider,
				authorization_code: request.credential
			})
		});

		const result = await this.handleResponse<{ message: string }>(response);

		return {
			message: result.message,
			success: true,
			provider: request.provider,
			provider_identifier: "" // Unified endpoint doesn't return provider-specific email
		};
	}

	/**
	 * Link GitHub provider using unified endpoint
	 */
	private static async linkGitHubProvider(request: LinkOAuthProviderRequest): Promise<OAuthOperationResponse> {
		const response = await fetch("/api/v1/users/me/link-oauth", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...createAuthHeaders()
			},
			body: JSON.stringify({
				provider: request.provider,
				authorization_code: request.credential
			})
		});

		const result = await this.handleResponse<{ message: string }>(response);

		return {
			message: result.message,
			success: true,
			provider: request.provider,
			provider_identifier: "" // Unified endpoint doesn't return provider-specific email
		};
	}

	/**
	 * Generic unlink provider method
	 * Routes to provider-specific implementations based on provider name
	 */
	static async unlinkProvider(request: UnlinkOAuthProviderRequest): Promise<OAuthOperationResponse> {
		// Validate request first
		const validation = this.validateUnlinkRequest(request);
		if (!validation.isValid) {
			throw new Error(`Invalid unlink request: ${validation.errors.join(", ")}`);
		}

		// Route based on provider
		switch (request.provider) {
			case "google":
				return this.unlinkGoogleProvider(request);
			case "microsoft":
				return this.unlinkMicrosoftProvider(request);
			case "github":
				return this.unlinkGitHubProvider(request);
			default:
				throw new Error(`Unsupported provider: ${request.provider}`);
		}
	}

	/**
	 * Unlink Google provider using unified endpoint
	 */
	private static async unlinkGoogleProvider(request: UnlinkOAuthProviderRequest): Promise<OAuthOperationResponse> {
		const response = await fetch("/api/v1/users/me/unlink-oauth", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...createAuthHeaders()
			},
			body: JSON.stringify({
				provider: request.provider,
				password: request.password
			})
		});

		const result = await this.handleResponse<{ message: string }>(response);

		return {
			message: result.message,
			success: true,
			provider: request.provider
		};
	}

	/**
	 * Unlink Microsoft provider using unified endpoint
	 */
	private static async unlinkMicrosoftProvider(request: UnlinkOAuthProviderRequest): Promise<OAuthOperationResponse> {
		const response = await fetch("/api/v1/users/me/unlink-oauth", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...createAuthHeaders()
			},
			body: JSON.stringify({
				provider: request.provider,
				password: request.password
			})
		});

		const result = await this.handleResponse<{ message: string }>(response);

		return {
			message: result.message,
			success: true,
			provider: request.provider
		};
	}

	/**
	 * Unlink GitHub provider using unified endpoint
	 */
	private static async unlinkGitHubProvider(request: UnlinkOAuthProviderRequest): Promise<OAuthOperationResponse> {
		const response = await fetch("/api/v1/users/me/unlink-oauth", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...createAuthHeaders()
			},
			body: JSON.stringify({
				provider: request.provider,
				password: request.password
			})
		});

		const result = await this.handleResponse<{ message: string }>(response);

		return {
			message: result.message,
			success: true,
			provider: request.provider
		};
	}

	/**
	 * Check if OAuth consent is required before starting OAuth flow
	 *
	 * This method allows the frontend to determine consent requirements
	 * before initiating the OAuth process, enabling consent-first architecture.
	 */
	static async checkConsentRequired(request: OAuthConsentCheckRequest): Promise<OAuthConsentCheckResponse> {
		const response = await fetch("/api/v1/auth/oauth/check-consent", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify(request)
		});

		const result = await this.handleResponse<OAuthConsentCheckResponse>(response);
		return result;
	}

	/**
	 * Process OAuth authentication with consent flow support
	 *
	 * This method calls the OAuth endpoint and handles both regular auth responses
	 * and consent requirement responses.
	 */
	static async processOAuth(request: {
		provider: string;
		credential?: string;
		authorization_code?: string;
	}): Promise<AuthResponse | OAuthConsentResponse> {
		const body: any = {
			provider: request.provider
		};

		// Add credential based on provider type
		if (request.provider === "google" && request.credential) {
			body.credential = request.credential;
		} else if ((request.provider === "microsoft" || request.provider === "github") && request.authorization_code) {
			body.authorization_code = request.authorization_code;
		} else {
			throw new Error(`Invalid OAuth request for provider: ${request.provider}`);
		}

		const response = await fetch("/api/v1/auth/oauth", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify(body)
		});

		const result = await response.json();

		if (!response.ok) {
			const errorMessage = result.detail || result.message || `HTTP ${response.status}: ${response.statusText}`;
			throw new Error(errorMessage);
		}

		// Check if this is a consent response
		if (result.action === "consent_required") {
			return result as OAuthConsentResponse;
		}

		// Regular auth response
		return result as AuthResponse;
	}

	/**
	 * Process OAuth consent decision
	 *
	 * Sends the user's consent decision to the backend and returns the auth response.
	 */
	static async processOAuthConsent(request: OAuthConsentRequest): Promise<AuthResponse> {
		const body: any = {
			provider: request.provider,
			consent_given: request.consent_given
		};

		// Add credential based on provider type
		if (request.provider === "google" && request.credential) {
			body.credential = request.credential;
		} else if ((request.provider === "microsoft" || request.provider === "github") && request.authorization_code) {
			body.authorization_code = request.authorization_code;
		} else {
			throw new Error(`Invalid OAuth consent request for provider: ${request.provider}`);
		}

		const response = await fetch("/api/v1/auth/oauth/consent", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify(body)
		});

		const result = await this.handleResponse<AuthResponse>(response);
		return result;
	}

	/**
	 * Check if a response is a consent requirement
	 */
	static isConsentRequired(response: AuthResponse | OAuthConsentResponse): response is OAuthConsentResponse {
		return (response as OAuthConsentResponse).action === "consent_required";
	}

	/**
	 * Handle API response with consistent error processing
	 * Follows established error handling patterns from other services
	 */
	private static async handleResponse<T>(response: Response): Promise<T> {
		if (!response.ok) {
			const errorData = await response.json().catch(() => ({
				message: "Network error occurred"
			}));

			const errorMessage =
				errorData.detail || errorData.message || `HTTP ${response.status}: ${response.statusText}`;

			throw new Error(errorMessage);
		}

		return response.json();
	}
}

// Export utilities for easy future migration
export const OAuthProviders = {
	GOOGLE: "google",
	MICROSOFT: "microsoft",
	GITHUB: "github"
} as const;

export type SupportedOAuthProvider =
	| typeof OAuthProviders.GOOGLE
	| typeof OAuthProviders.MICROSOFT
	| typeof OAuthProviders.GITHUB;
