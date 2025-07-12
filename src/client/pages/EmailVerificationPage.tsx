import React, { useEffect } from "react";
import { useEmailVerification } from "../hooks/useEmailVerification";

/**
 * Dedicated page for handling email verification
 * Only runs verification logic when user visits /verify-email/token URLs
 */
const EmailVerificationPage: React.FC = () => {
	console.log("🔥 EmailVerificationPage component mounting");
	
	// This will only run on /verify-email/token pages
	const { state } = useEmailVerification({
		onSuccess: (message: string) => {
			console.log("🔥 Verification success:", message);
			// Could show success UI here
		},
		onError: (message: string) => {
			console.log("🔥 Verification error:", message);
			// Could show error UI here
		},
		onRedirectHome: () => {
			console.log("🔥 Redirecting to home page");
			// This could navigate to a specific page
		},
		onShowSignIn: () => {
			console.log("🔥 Should show sign in modal");
			// This could trigger auth modal
		}
	});

	return (
		<div className="flex min-h-screen items-center justify-center">
			<div className="text-center">
				{state.isVerifying && (
					<div>
						<h2 className="text-2xl font-bold">Verifying Email...</h2>
						<p>Please wait while we verify your email address.</p>
					</div>
				)}
				
				{state.success && (
					<div>
						<h2 className="text-2xl font-bold text-green-600">Email Verified!</h2>
						<p>Your email has been successfully verified. You can now sign in.</p>
					</div>
				)}
				
				{state.error && (
					<div>
						<h2 className="text-2xl font-bold text-red-600">Verification Failed</h2>
						<p>{state.error}</p>
					</div>
				)}
			</div>
		</div>
	);
};

export default EmailVerificationPage;