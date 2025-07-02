import React, { useState } from "react";
import Header from "./components/Header";
import RegistrationModal from "./components/RegistrationModal";
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
	const [showRegistrationModal, setShowRegistrationModal] = useState(false);
	const auth = useAuth();

	const handleShowRegistration = (): void => {
		setShowRegistrationModal(true);
	};

	const handleCloseRegistration = (): void => {
		setShowRegistrationModal(false);
	};

	const handleRegistrationSuccess = (redirectTo?: string): void => {
		setShowRegistrationModal(false);
		if (redirectTo === "dashboard") {
			setCurrentPage("dashboard");
		}
	};

	const renderPage = (): React.JSX.Element => {
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
				auth={auth}
			/>
			{renderPage()}
			<footer className="border-layout-background bg-layout-background text-text-primary mt-auto border-t px-8 py-6 text-center text-sm">
				<p className="m-0 mx-auto max-w-[3840px]">&copy; 2025 Zentropy. All rights reserved.</p>
			</footer>

			<RegistrationModal
				isOpen={showRegistrationModal}
				onClose={handleCloseRegistration}
				onSuccess={handleRegistrationSuccess}
			/>
		</div>
	);
}

export default App;
