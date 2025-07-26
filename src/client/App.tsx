import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import AuthModal from "./components/AuthModal";
import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import TeamsPage from "./pages/TeamsPage";
import CalendarPage from "./pages/CalendarPage";
import ProfilePage from "./pages/ProfilePage";
import DashboardPage from "./pages/DashboardPage";
import TeamConfigurationPage from "./pages/TeamConfigurationPage";
import EmailVerificationModal from "./components/EmailVerificationModal";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useAuth } from "./hooks/useAuth";
import { ToastProvider } from "./contexts/ToastContext";

type Page = "home" | "about" | "contact" | "profile" | "teams" | "calendar" | "dashboard" | "team-configuration";

function App(): React.JSX.Element {
	const [currentPage, setCurrentPage] = useState<Page>("home");
	const [showAuthModal, setShowAuthModal] = useState(false);
	const [authModalMode, setAuthModalMode] = useState<"signin" | "signup">("signin");
	const [showVerificationPage, setShowVerificationPage] = useState(false);
	const [verificationEmail, setVerificationEmail] = useState<string>("");
	const auth = useAuth();

	// Check for legacy email verification URL on app load and redirect
	useEffect(() => {
		const pathSegments = window.location.pathname.split("/");
		if (pathSegments[1] === "verify" && pathSegments[2]) {
			// Legacy verification URL detected - show verification page
			setShowVerificationPage(true);
			// Clean URL
			window.history.pushState({}, "", "/");
		}
	}, []);

	const handleShowRegistration = (): void => {
		setAuthModalMode("signup");
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

	const handleShowVerification = (email: string): void => {
		setVerificationEmail(email);
		setShowVerificationPage(true);
		setShowAuthModal(false);
	};

	const handleCloseVerification = (): void => {
		setShowVerificationPage(false);
		setVerificationEmail("");
		// Just close - user can continue via header buttons if needed
		// Sign-in modal should only appear on successful verification, not on close
	};

	const handleVerificationSuccess = (): void => {
		setShowVerificationPage(false);
		setVerificationEmail("");
		// Show sign in modal after successful verification (registration flow)
		setAuthModalMode("signin");
		setShowAuthModal(true);
	};

	// Handle redirects in useEffect to prevent setState during render
	useEffect(() => {
		const projectsPages = ["teams", "calendar", "dashboard", "team-configuration"];

		// Redirect to home if user tries to access Projects pages without permission
		if (
			projectsPages.includes(currentPage) &&
			auth.isAuthenticated &&
			auth.user &&
			!auth.user.has_projects_access
		) {
			setCurrentPage("home");
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentPage, auth.isAuthenticated, auth.user?.has_projects_access]); // auth.user is intentionally excluded to avoid unnecessary re-renders

	const renderPage = (): React.JSX.Element => {
		switch (currentPage) {
			case "home":
				return (
					<ErrorBoundary>
						<HomePage />
					</ErrorBoundary>
				);
			case "about":
				return (
					<ErrorBoundary>
						<AboutPage />
					</ErrorBoundary>
				);
			case "contact":
				return (
					<ErrorBoundary>
						<ContactPage />
					</ErrorBoundary>
				);
			case "teams":
				return (
					<ErrorBoundary>
						<TeamsPage />
					</ErrorBoundary>
				);
			case "calendar":
				return (
					<ErrorBoundary>
						<CalendarPage />
					</ErrorBoundary>
				);
			case "profile":
				return (
					<ErrorBoundary>
						<ProfilePage />
					</ErrorBoundary>
				);
			case "dashboard":
				return (
					<ErrorBoundary>
						<DashboardPage />
					</ErrorBoundary>
				);
			case "team-configuration":
				return (
					<ErrorBoundary>
						<TeamConfigurationPage />
					</ErrorBoundary>
				);
			default:
				return (
					<ErrorBoundary>
						<HomePage />
					</ErrorBoundary>
				);
		}
	};

	return (
		<ToastProvider>
			<div className="flex min-h-screen flex-col">
				<Header
					currentPage={currentPage}
					onPageChange={setCurrentPage}
					onShowRegistration={handleShowRegistration}
					onShowSignIn={handleShowSignIn}
					onShowVerification={handleShowVerification}
					auth={auth}
				/>
				{renderPage()}
				<footer className="border-layout-background bg-layout-background text-text-primary mt-auto border-t px-8 py-6 text-center text-sm">
					<p className="m-0 mx-auto max-w-[3840px]">&copy; 2025 Zentropy. All rights reserved.</p>
				</footer>

				<ErrorBoundary>
					<AuthModal
						isOpen={showAuthModal}
						onClose={handleCloseAuth}
						onSuccess={handleAuthSuccess}
						auth={auth}
						initialMode={authModalMode}
						onShowVerification={handleShowVerification}
					/>
				</ErrorBoundary>

				{/* Email Verification Modal */}
				<ErrorBoundary>
					<EmailVerificationModal
						isOpen={showVerificationPage}
						onClose={handleCloseVerification}
						onSuccess={handleVerificationSuccess}
						initialEmail={verificationEmail}
					/>
				</ErrorBoundary>
			</div>
		</ToastProvider>
	);
}

export default App;
