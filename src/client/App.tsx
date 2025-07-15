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
		// Show sign in modal after successful verification
		setAuthModalMode("signin");
		setShowAuthModal(true);
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

				<AuthModal
					isOpen={showAuthModal}
					onClose={handleCloseAuth}
					onSuccess={handleAuthSuccess}
					auth={auth}
					initialMode={authModalMode}
					onShowVerification={handleShowVerification}
				/>

				{/* Email Verification Modal */}
				<EmailVerificationModal
					isOpen={showVerificationPage}
					onClose={handleCloseVerification}
					onSuccess={handleAuthSuccess}
					initialEmail={verificationEmail}
				/>
			</div>
		</ToastProvider>
	);
}

export default App;
