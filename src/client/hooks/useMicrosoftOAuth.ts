import { useOAuth, type OAuthConfig } from "./useOAuth";

interface UseMicrosoftOAuthProps {
	onSuccess: (credential: string) => void;
	onError?: (error: string) => void;
}

interface UseMicrosoftOAuthReturn {
	isReady: boolean;
	isLoading: boolean;
	error: string | null;
	triggerOAuth: () => void;
	clearError: () => void;
}

const microsoftOAuthConfig: OAuthConfig = {
	provider: "microsoft",
	clientIdEnvVar: "VITE_MICROSOFT_CLIENT_ID",
	displayName: "Microsoft"
};

export const useMicrosoftOAuth = ({ onSuccess, onError }: UseMicrosoftOAuthProps): UseMicrosoftOAuthReturn => {
	return useOAuth({
		config: microsoftOAuthConfig,
		onSuccess,
		...(onError && { onError })
	});
};
