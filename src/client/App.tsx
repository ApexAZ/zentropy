import React, { useState, useEffect, useRef } from "react";
import Header from "./components/Header";
import AuthModal from "./components/AuthModal";
import EmailVerificationStatusBanner from "./components/EmailVerificationStatusBanner";
import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import TeamsPage from "./pages/TeamsPage";
import CalendarPage from "./pages/CalendarPage";
import ProfilePage from "./pages/ProfilePage";
import DashboardPage from "./pages/DashboardPage";
import TeamConfigurationPage from "./pages/TeamConfigurationPage";
import { useAuth } from "./hooks/useAuth";
import { logger } from "./utils/logger";

type Page = "home" | "about" | "contact" | "profile" | "teams" | "calendar" | "dashboard" | "team-configuration";

function App(): React.JSX.Element {
	const [currentPage, setCurrentPage] = useState<Page>("home");
	const [showAuthModal, setShowAuthModal] = useState(false);
	const [authModalMode, setAuthModalMode] = useState<"signin" | "signup" | "method-selection">("method-selection");
	const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
	const verificationAttempted = useRef<Set<string>>(new Set());
	const auth = useAuth();

	// Handle email verification in background
	useEffect(() => {
		logger.debug("App useEffect running", { pathname: window.location.pathname });
		const pathSegments = window.location.pathname.split("/");
		if (pathSegments[1] === "verify-email" && pathSegments[2]) {
			const token = pathSegments[2];

			// Check if we've already attempted verification for this token
			if (verificationAttempted.current.has(token)) {
				logger.debug("Skipping duplicate verification attempt", { token });
				return;
			}

			logger.info("Email verification token detected", { token });
			verificationAttempted.current.add(token);
			verifyEmailInBackground(token);
		}
	}, []);

	// Auto-hide toast after 5 seconds
	useEffect(() => {
		if (toast) {
			const timer = setTimeout(() => setToast(null), 5000);
			return () => clearTimeout(timer);
		}
		return undefined;
	}, [toast]);

	const verifyEmailInBackground = async (token: string) => {
		logger.info("Email verification started", { token });
		try {
			const response = await fetch(`/api/v1/auth/verify-email/${token}`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				}
			});

			logger.info("Verification response received", { status: response.status, ok: response.ok });

			// Clean URL immediately
			window.history.pushState({}, "", "/");
			setCurrentPage("home");

			if (response.ok) {
				// Success - show sign in modal with success toast
				logger.info("Email verification successful");
				setToast({ message: "Email verified successfully! Please sign in.", type: "success" });
				setAuthModalMode("signin");
				setShowAuthModal(true);
			} else {
				// Error - show sign in modal with error toast
				const errorData = await response.json();
				logger.warn("Email verification failed", { errorData });
				setToast({
					message: errorData.detail || "Email verification failed. Please try again.",
					type: "error"
				});
				setAuthModalMode("signin");
				setShowAuthModal(true);
			}
		} catch (error) {
			// Network error - clean URL and show sign in with error toast
			logger.error("Network error during verification", { error });
			window.history.pushState({}, "", "/");
			setCurrentPage("home");
			setToast({ message: "Network error during email verification. Please try again.", type: "error" });
			setAuthModalMode("signin");
			setShowAuthModal(true);
		}
	};

	const handleShowRegistration = (): void => {
		setAuthModalMode("method-selection");
		setShowAuthModal(true);
	};

	const handleShowSignIn = (): void => {
		setAuthModalMode("signin");
		setShowAuthModal(true);
	};

	const handleCloseAuth = (): void => {
		setShowAuthModal(false);
	};

	const handleAuthSuccess = (): void => {
		setShowAuthModal(false);
		// Stay on current page after successful authentication
	};

	const renderPage = (): React.JSX.Element => {
		// Projects module pages that require special access
		const projectsPages = ["teams", "calendar", "dashboard", "team-configuration"];

		// Redirect to home if user tries to access Projects pages without permission
		if (
			projectsPages.includes(currentPage) &&
			auth.isAuthenticated &&
			auth.user &&
			!auth.user.has_projects_access
		) {
			setCurrentPage("home");
			return <HomePage />;
		}

		switch (currentPage) {
			case "home":
				return <HomePage />;
			case "about":
				return <AboutPage />;
			case "contact":
				return <ContactPage />;
			case "teams":
				return <TeamsPage />;
			case "calendar":
				return <CalendarPage />;
			case "profile":
				return <ProfilePage />;
			case "dashboard":
				return <DashboardPage />;
			case "team-configuration":
				return <TeamConfigurationPage />;
			default:
				return <HomePage />;
		}
	};

	// Show email verification banner for authenticated users with unverified emails
	const showEmailVerificationBanner = auth.isAuthenticated && auth.user && !auth.user.email_verified;

	return (
		<div className="flex min-h-screen flex-col">
			<Header
				currentPage={currentPage}
				onPageChange={setCurrentPage}
				onShowRegistration={handleShowRegistration}
				onShowSignIn={handleShowSignIn}
				auth={auth}
			/>
			{showEmailVerificationBanner && auth.user && (
				<EmailVerificationStatusBanner userEmail={auth.user.email} isVisible={true} />
			)}
			{renderPage()}
			<footer className="border-layout-background bg-layout-background text-text-primary mt-auto border-t px-8 py-6 text-center text-sm">
				<p className="m-0 mx-auto max-w-[3840px]">&copy; 2025 Zentropy. All rights reserved.</p>
			</footer>

			<AuthModal
				isOpen={showAuthModal}
				onClose={handleCloseAuth}
				onSuccess={handleAuthSuccess}
				auth={auth}
				initialMode={authModalMode}
			/>

			{/* Toast Notification */}
			{toast && (
				<div className="fixed top-5 right-5 z-[1100] min-w-[300px] animate-[slideIn_0.3s_ease] rounded-md shadow-lg">
					<div
						className={`flex items-center justify-between gap-2 p-4 ${
							toast.type === "success"
								? "border-layout-background bg-layout-background text-text-primary border"
								: "border border-red-200 bg-red-50 text-red-700"
						}`}
					>
						<div className="flex-1 text-sm leading-5">{toast.message}</div>
						<button
							onClick={() => setToast(null)}
							className="opacity-80 transition-opacity duration-200 hover:opacity-100"
							aria-label="Close notification"
						>
							&times;
						</button>
					</div>
				</div>
			)}

			<style>{`
				@keyframes slideIn {
					from { opacity: 0; transform: translateX(100%); }
					to { opacity: 1; transform: translateX(0); }
				}
			`}</style>
		</div>
	);
}

export default App;
