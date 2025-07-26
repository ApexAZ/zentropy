import { useOAuth, type OAuthConfig } from "./useOAuth";

interface UseGitHubOAuthProps {
	onSuccess: (credential: string) => void;
	onError?: (error: string) => void;
}

interface UseGitHubOAuthReturn {
	isReady: boolean;
	isLoading: boolean;
	error: string | null;
	triggerOAuth: () => void;
	clearError: () => void;
}

const githubOAuthConfig: OAuthConfig = {
	provider: "github",
	clientIdEnvVar: "VITE_GITHUB_CLIENT_ID",
	displayName: "GitHub"
};

export const useGitHubOAuth = ({ onSuccess, onError }: UseGitHubOAuthProps): UseGitHubOAuthReturn => {
	return useOAuth({
		config: githubOAuthConfig,
		onSuccess,
		...(onError && { onError })
	});
};
