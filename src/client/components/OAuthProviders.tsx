import React from "react";
import { useGoogleOAuth } from "../hooks/useGoogleOAuth";
import type { GoogleCredentialResponse } from "../types/global";

interface OAuthProvidersProps {
	onGoogleSignIn?: (credentialResponse: GoogleCredentialResponse) => void;
	disabled?: boolean;
}

const OAuthProviders: React.FC<OAuthProvidersProps> = ({ onGoogleSignIn, disabled = false }) => {
	// Use centralized Google OAuth hook instead of direct initialization
	const { isReady, isLoading, error, triggerOAuth, clearError: _ } = useGoogleOAuth({
		onSuccess: (credential: string) => {
			// Transform credential string back to GoogleCredentialResponse format for backward compatibility
			if (onGoogleSignIn) {
				onGoogleSignIn({ credential });
			}
		},
		onError: (errorMessage: string) => {
			console.error("Google OAuth error in OAuthProviders:", errorMessage);
		}
	});

	const handleGoogleSignIn = () => {
		triggerOAuth();
	};

	return (
		<div className="w-full">
			{/* OAuth Providers Section */}
			<div className="mb-6">
				<p className="text-text-primary mb-4 text-center text-sm">Continue with your preferred account</p>

				{/* OAuth Provider Buttons - Horizontal Layout for 4 providers */}
				<div className="grid grid-cols-4 gap-3">
					{/* Google OAuth */}
					<button
						type="button"
						onClick={handleGoogleSignIn}
						disabled={disabled || !isReady || isLoading || !!error}
						className="border-layout-background bg-content-background text-text-primary hover:bg-layout-background flex aspect-square cursor-pointer items-center justify-center rounded-lg border p-3 transition-all duration-200 hover:-translate-y-px hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
						aria-label={error ? `Google Sign-In Error: ${error}` : isLoading ? "Signing in with Google..." : "Continue with Google"}
						title={error ? `Google Sign-In Error: ${error}` : isLoading ? "Signing in with Google..." : "Continue with Google"}
					>
						{isLoading ? (
							/* Loading Spinner */
							<div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
						) : (
							/* Google "G" Logo */
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
								<path
									d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
									fill="#4285F4"
								/>
								<path
									d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
									fill="#34A853"
								/>
								<path
									d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
									fill="#FBBC05"
								/>
								<path
									d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
									fill="#EA4335"
								/>
							</svg>
						)}
					</button>

					{/* Microsoft OAuth - Placeholder */}
					<button
						type="button"
						disabled={true}
						className="border-layout-background bg-content-background text-text-primary flex aspect-square cursor-not-allowed items-center justify-center rounded-lg border p-3 opacity-50"
						aria-label="Microsoft (Coming Soon)"
						title="Microsoft (Coming Soon)"
					>
						{/* Microsoft Logo */}
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
							<rect x="1" y="1" width="10" height="10" fill="#F25022" />
							<rect x="13" y="1" width="10" height="10" fill="#7FBA00" />
							<rect x="1" y="13" width="10" height="10" fill="#00A4EF" />
							<rect x="13" y="13" width="10" height="10" fill="#FFB900" />
						</svg>
					</button>

					{/* GitHub OAuth - Placeholder */}
					<button
						type="button"
						disabled={true}
						className="border-layout-background bg-content-background text-text-primary flex aspect-square cursor-not-allowed items-center justify-center rounded-lg border p-3 opacity-50"
						aria-label="GitHub (Coming Soon)"
						title="GitHub (Coming Soon)"
					>
						{/* GitHub Logo */}
						<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
							<path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.300 24 12c0-6.627-5.373-12-12-12z" />
						</svg>
					</button>

					{/* Apple OAuth - Placeholder */}
					<button
						type="button"
						disabled={true}
						className="border-layout-background bg-content-background text-text-primary flex aspect-square cursor-not-allowed items-center justify-center rounded-lg border p-3 opacity-50"
						aria-label="Apple (Coming Soon)"
						title="Apple (Coming Soon)"
					>
						{/* Apple Logo */}
						<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
							<path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
						</svg>
					</button>
				</div>
			</div>

			{/* Divider */}
			<div className="my-6 flex items-center">
				<div className="border-layout-background flex-1 border-t"></div>
				<span className="text-text-primary bg-content-background px-4 text-sm">or continue with email</span>
				<div className="border-layout-background flex-1 border-t"></div>
			</div>
		</div>
	);
};

export default OAuthProviders;
