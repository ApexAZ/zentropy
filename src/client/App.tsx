import React, { useState } from "react";
import Header from "./components/Header";
import RegistrationMethodModal from "./components/RegistrationMethodModal";
import EmailRegistrationModal from "./components/EmailRegistrationModal";
import LoginModal from "./components/LoginModal";
import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import TeamsPage from "./pages/TeamsPage";
import CalendarPage from "./pages/CalendarPage";
import ProfilePage from "./pages/ProfilePage";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import TeamConfigurationPage from "./pages/TeamConfigurationPage";
import { useAuth } from "./hooks/useAuth";

type Page =
	| "home"
	| "about"
	| "contact"
	| "profile"
	| "teams"
	| "calendar"
	| "dashboard"
	| "login"
	| "team-configuration";

function App(): React.JSX.Element {
	const [currentPage, setCurrentPage] = useState<Page>("home");
	const [showRegistrationMethodModal, setShowRegistrationMethodModal] = useState(false);
	const [showEmailRegistrationModal, setShowEmailRegistrationModal] = useState(false);
	const [showLoginModal, setShowLoginModal] = useState(false);
	const auth = useAuth();

	const handleShowRegistration = (): void => {
		setShowRegistrationMethodModal(true);
	};

	const handleCloseRegistrationMethod = (): void => {
		setShowRegistrationMethodModal(false);
	};

	const handleSelectEmailRegistration = (): void => {
		// Method modal closes itself, now show email registration modal
		setShowEmailRegistrationModal(true);
	};

	// Google OAuth handler temporarily disabled for debugging
	// const handleSelectGoogleRegistration = async (credential?: string): Promise<void> => {
	//   // Implementation temporarily disabled
	// };

	const handleCloseEmailRegistration = (): void => {
		setShowEmailRegistrationModal(false);
	};

	const handleEmailRegistrationSuccess = (redirectTo?: string): void => {
		setShowEmailRegistrationModal(false);
		if (redirectTo === "dashboard") {
			setCurrentPage("dashboard");
		} else {
			// After successful registration, show login modal
			setShowLoginModal(true);
		}
	};

	const handleShowLogin = (): void => {
		setShowLoginModal(true);
	};

	const handleCloseLogin = (): void => {
		setShowLoginModal(false);
	};

	const handleLoginSuccess = (): void => {
		setShowLoginModal(false);
		// Stay on current page after successful login
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
			case "login":
				return <LoginPage />;
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
				onShowLogin={handleShowLogin}
				auth={auth}
			/>
			{renderPage()}
			<footer className="border-layout-background bg-layout-background text-text-primary mt-auto border-t px-8 py-6 text-center text-sm">
				<p className="m-0 mx-auto max-w-[3840px]">&copy; 2025 Zentropy. All rights reserved.</p>
			</footer>

			<RegistrationMethodModal
				isOpen={showRegistrationMethodModal}
				onClose={handleCloseRegistrationMethod}
				onSelectEmail={handleSelectEmailRegistration}
			/>

			<EmailRegistrationModal
				isOpen={showEmailRegistrationModal}
				onClose={handleCloseEmailRegistration}
				onSuccess={handleEmailRegistrationSuccess}
			/>

			<LoginModal isOpen={showLoginModal} onClose={handleCloseLogin} onSuccess={handleLoginSuccess} auth={auth} />
		</div>
	);
}

export default App;
