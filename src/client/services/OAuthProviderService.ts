import type {
	OAuthProvider,
	OAuthProviderState,
	LinkOAuthProviderRequest,
	UnlinkOAuthProviderRequest,
	OAuthOperationResponse
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
	 * Link Google provider
	 */
	private static async linkGoogleProvider(request: LinkOAuthProviderRequest): Promise<OAuthOperationResponse> {
		const response = await fetch("/api/v1/users/me/link-google", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...createAuthHeaders()
			},
			body: JSON.stringify({
				google_credential: request.credential
			})
		});

		const result = await this.handleResponse<{ message: string; google_email: string }>(response);

		return {
			message: result.message,
			success: true,
			provider: request.provider,
			provider_identifier: result.google_email
		};
	}

	/**
	 * Link Microsoft provider
	 */
	private static async linkMicrosoftProvider(request: LinkOAuthProviderRequest): Promise<OAuthOperationResponse> {
		const response = await fetch("/api/v1/users/me/link-microsoft", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...createAuthHeaders()
			},
			body: JSON.stringify({
				microsoft_credential: request.credential
			})
		});

		const result = await this.handleResponse<{ message: string; microsoft_email?: string }>(response);

		return {
			message: result.message,
			success: true,
			provider: request.provider,
			provider_identifier: result.microsoft_email ?? ""
		};
	}

	/**
	 * Link GitHub provider
	 */
	private static async linkGitHubProvider(request: LinkOAuthProviderRequest): Promise<OAuthOperationResponse> {
		const response = await fetch("/api/v1/users/me/link-github", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...createAuthHeaders()
			},
			body: JSON.stringify({
				github_credential: request.credential
			})
		});

		const result = await this.handleResponse<{ message: string; github_email?: string }>(response);

		return {
			message: result.message,
			success: true,
			provider: request.provider,
			provider_identifier: result.github_email ?? ""
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
	 * Unlink Google provider
	 */
	private static async unlinkGoogleProvider(request: UnlinkOAuthProviderRequest): Promise<OAuthOperationResponse> {
		const response = await fetch("/api/v1/users/me/unlink-google", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...createAuthHeaders()
			},
			body: JSON.stringify({
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
	 * Unlink Microsoft provider
	 */
	private static async unlinkMicrosoftProvider(request: UnlinkOAuthProviderRequest): Promise<OAuthOperationResponse> {
		const response = await fetch("/api/v1/users/me/unlink-microsoft", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...createAuthHeaders()
			},
			body: JSON.stringify({
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
	 * Unlink GitHub provider
	 */
	private static async unlinkGitHubProvider(request: UnlinkOAuthProviderRequest): Promise<OAuthOperationResponse> {
		const response = await fetch("/api/v1/users/me/unlink-github", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...createAuthHeaders()
			},
			body: JSON.stringify({
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

/**
 * Enhanced Google OAuth Integration
 *
 * This class provides a wrapper around the existing useGoogleOAuth hook
 * to enable future provider abstraction while maintaining full compatibility.
 *
 * USAGE: Can be used alongside or instead of direct useGoogleOAuth calls
 * MIGRATION: When ready for multi-provider, components can easily switch to this
 */
export class GoogleOAuthIntegration {
	private googleOAuthHook: any = null;
	private onErrorCallback: ((error: string) => void) | null = null;

	constructor(options: { onSuccess: (credential: string) => void; onError?: (error: string) => void }) {
		// onSuccess is handled directly by the integrated hook
		this.onErrorCallback = options.onError || null;
	}

	/**
	 * Integrate with existing useGoogleOAuth hook
	 * This maintains 100% compatibility with current implementation
	 */
	integrateWithHook(googleOAuthHook: any): void {
		this.googleOAuthHook = googleOAuthHook;
	}

	/**
	 * Get current OAuth state
	 * Maps to the OAuthProviderState interface for consistency
	 */
	getState(): OAuthProviderState {
		if (!this.googleOAuthHook) {
			return {
				isReady: false,
				isLoading: false,
				error: "Google OAuth hook not integrated"
			};
		}

		return {
			isReady: this.googleOAuthHook.isReady,
			isLoading: this.googleOAuthHook.isLoading,
			error: this.googleOAuthHook.error
		};
	}

	/**
	 * Trigger OAuth authentication
	 * Delegates to existing useGoogleOAuth implementation
	 */
	authenticate(): void {
		if (!this.googleOAuthHook) {
			const error = "Google OAuth hook not integrated";
			this.onErrorCallback?.(error);
			return;
		}

		this.googleOAuthHook.triggerOAuth();
	}

	/**
	 * Clear any authentication errors
	 * Delegates to existing useGoogleOAuth implementation
	 */
	clearError(): void {
		if (this.googleOAuthHook) {
			this.googleOAuthHook.clearError();
		}
	}

	/**
	 * Get provider metadata
	 */
	getProviderInfo(): OAuthProvider {
		return OAuthProviderService.getProvider("google")!;
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
