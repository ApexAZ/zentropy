import { useCallback, useMemo } from "react";
import { OAuthProviderService } from "../services/OAuthProviderService";
import { useGoogleOAuth } from "./useGoogleOAuth";
import { useMicrosoftOAuth } from "./useMicrosoftOAuth";
import { useGitHubOAuth } from "./useGitHubOAuth";
import type { OAuthProvider, OAuthProviderState, AccountSecurityResponse } from "../types";
import { logger } from "../utils/logger";
import { AccountSecurityErrorHandler } from "../utils/errorHandling";

interface UseMultiProviderOAuthProps {
	onSuccess: (credential: string, provider: string) => void;
	onError: (error: string) => void;
	securityStatus: AccountSecurityResponse | null;
}

interface UseMultiProviderOAuthReturn {
	providers: OAuthProvider[];
	linkProvider: (providerName: string) => void;
	unlinkProvider: (providerName: string, password: string) => Promise<void>;
	getProviderState: (providerName: string) => OAuthProviderState;
	isProviderLinked: (providerName: string) => boolean;
}

export const useMultiProviderOAuth = ({
	onSuccess,
	onError,
	securityStatus
}: UseMultiProviderOAuthProps): UseMultiProviderOAuthReturn => {
	// Get all available providers from the service
	const providers = useMemo(() => {
		try {
			return OAuthProviderService.getAvailableProviders();
		} catch (error) {
			logger.error("Failed to get available providers", { error });
			return [];
		}
	}, []);

	// Individual OAuth hooks for each provider
	const googleOAuth = useGoogleOAuth({
		onSuccess: (credential: string) => onSuccess(credential, "google"),
		onError
	});

	const microsoftOAuth = useMicrosoftOAuth({
		onSuccess: (credential: string) => onSuccess(credential, "microsoft"),
		onError
	});

	const githubOAuth = useGitHubOAuth({
		onSuccess: (credential: string) => onSuccess(credential, "github"),
		onError
	});

	// Map provider names to their respective OAuth hooks
	const providerHooks = useMemo(
		() => ({
			google: googleOAuth,
			microsoft: microsoftOAuth,
			github: githubOAuth
		}),
		[googleOAuth, microsoftOAuth, githubOAuth]
	);

	// Check if a provider is linked based on security status
	const isProviderLinked = useCallback(
		(providerName: string): boolean => {
			if (!securityStatus) return false;

			// Use centralized oauth_providers array first
			const provider = securityStatus.oauth_providers?.find(p => p.provider === providerName);
			if (provider) {
				return provider.linked;
			}

			// Fallback for backwards compatibility
			switch (providerName) {
				case "google":
					return securityStatus.google_auth_linked ?? false;
				default:
					return false;
			}
		},
		[securityStatus]
	);

	// Get the current state of a provider
	const getProviderState = useCallback(
		(providerName: string): OAuthProviderState => {
			const hook = providerHooks[providerName as keyof typeof providerHooks];

			if (!hook) {
				return {
					isReady: false,
					isLoading: false,
					error: "Provider not found"
				};
			}

			return {
				isReady: hook.isReady,
				isLoading: hook.isLoading,
				error: hook.error
			};
		},
		[providerHooks]
	);

	// Trigger OAuth flow for a specific provider
	const linkProvider = useCallback(
		(providerName: string): void => {
			const hook = providerHooks[providerName as keyof typeof providerHooks];

			if (!hook) {
				const rawError = `Provider not found: ${providerName}`;
				logger.error(rawError);

				// Use centralized error handling for consistent user experience
				const errorDetails = AccountSecurityErrorHandler.processError(rawError, "loading");
				onError(errorDetails.message);
				return;
			}

			try {
				logger.info(`Initiating OAuth flow for provider: ${providerName}`);
				hook.triggerOAuth();
			} catch (error) {
				const rawError = `Failed to initiate OAuth for ${providerName}`;
				logger.error(rawError, { error });

				// Use centralized error handling for consistent user experience
				const errorDetails = AccountSecurityErrorHandler.processError(rawError, "loading");
				onError(errorDetails.message);
			}
		},
		[providerHooks, onError]
	);

	// Unlink a specific provider
	const unlinkProvider = useCallback(
		async (providerName: string, password: string): Promise<void> => {
			const hook = providerHooks[providerName as keyof typeof providerHooks];

			if (!hook) {
				const rawError = `Provider not found: ${providerName}`;
				logger.error(rawError);

				// Use centralized error handling for consistent user experience
				const errorDetails = AccountSecurityErrorHandler.processError(rawError, "unlinking");
				throw new Error(errorDetails.message);
			}

			try {
				logger.info(`Unlinking provider: ${providerName}`);

				// Use centralized OAuthProviderService for all providers (unified architecture)
				await OAuthProviderService.unlinkProvider({
					provider: providerName,
					password: password
				});
			} catch (error) {
				const errorMessage = `Failed to unlink ${providerName}`;
				logger.error(errorMessage, { error });
				throw error;
			}
		},
		[providerHooks]
	);

	return {
		providers,
		linkProvider,
		unlinkProvider,
		getProviderState,
		isProviderLinked
	};
};
