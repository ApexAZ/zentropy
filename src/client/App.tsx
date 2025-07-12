import React, { useState, useEffect, useCallback } from "react";
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
import EmailVerificationPage from "./pages/EmailVerificationPage";
import { useAuth } from "./hooks/useAuth";

type Page = "home" | "about" | "contact" | "profile" | "teams" | "calendar" | "dashboard" | "team-configuration";

function App(): React.JSX.Element {
	console.log("🔥 APP STARTUP: Current URL:", window.location.href);
	console.log("🔥 APP STARTUP: Pathname:", window.location.pathname);
	
	const [currentPage, setCurrentPage] = useState<Page>("home");
	const [showAuthModal, setShowAuthModal] = useState(false);
	const [authModalMode, setAuthModalMode] = useState<"signin" | "signup" | "method-selection">("method-selection");
	const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
	const auth = useAuth();

	// Check for email verification URL on app load
	useEffect(() => {
		const pathSegments = window.location.pathname.split("/");
		if (pathSegments[1] === "verify" && pathSegments[2]) {
			// This is a verification URL - no routing needed, just log it
			console.log("🔥 APP: Detected verification URL, EmailVerificationPage will handle it");
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

	const renderPage = (): React.JSX.Element => {
		// Check if this is an email verification URL
		const pathSegments = window.location.pathname.split("/");
		if (pathSegments[1] === "verify" && pathSegments[2]) {
			console.log("🔥 APP: Rendering EmailVerificationPage for URL:", window.location.pathname);
			return <EmailVerificationPage />;
		}

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
		<div className="flex min-h-screen flex-col">
			<Header
				currentPage={currentPage}
				onPageChange={setCurrentPage}
				onShowRegistration={handleShowRegistration}
				onShowSignIn={handleShowSignIn}
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
			/>

			{/* Toast Notification */}
			{toast && (
				<div className="animate-slide-in fixed top-5 right-5 z-[1100] min-w-[300px] rounded-md shadow-lg">
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
		</div>
	);
}

export default App;
