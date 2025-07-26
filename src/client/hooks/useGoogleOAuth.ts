import { useOAuth, type OAuthConfig } from "./useOAuth";

interface UseGoogleOAuthProps {
	onSuccess: (credential: string) => void;
	onError?: (error: string) => void;
}

interface UseGoogleOAuthReturn {
	isReady: boolean;
	isLoading: boolean;
	error: string | null;
	triggerOAuth: () => void;
	clearError: () => void;
}

const googleOAuthConfig: OAuthConfig = {
	provider: "google",
	clientIdEnvVar: "VITE_GOOGLE_CLIENT_ID",
	displayName: "Google"
};

export const useGoogleOAuth = ({ onSuccess, onError }: UseGoogleOAuthProps): UseGoogleOAuthReturn => {
	return useOAuth({
		config: googleOAuthConfig,
		onSuccess,
		...(onError && { onError })
	});
};
