import React, { useState, useEffect, useRef } from "react";
import Header from "./components/Header";
import RegistrationMethodModal from "./components/RegistrationMethodModal";
import EmailRegistrationModal from "./components/EmailRegistrationModal";
import LoginModal from "./components/LoginModal";
import EmailVerificationStatusBanner from "./components/EmailVerificationStatusBanner";
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
	const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
	const verificationAttempted = useRef<Set<string>>(new Set());
	const auth = useAuth();

	// Handle email verification in background
	useEffect(() => {
		console.log("🔄 App useEffect running, pathname:", window.location.pathname);
		const pathSegments = window.location.pathname.split("/");
		if (pathSegments[1] === "verify-email" && pathSegments[2]) {
			const token = pathSegments[2];

			// Check if we've already attempted verification for this token
			if (verificationAttempted.current.has(token)) {
				console.log("🚫 Skipping duplicate verification attempt for token:", token);
				return;
			}

			console.log("🎯 Email verification token detected:", token);
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
	}, [toast]);

	const verifyEmailInBackground = async (token: string) => {
		console.log("🔍 Email verification started for token:", token);
		try {
			const response = await fetch(`/api/auth/verify-email/${token}`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				}
			});

			console.log("📡 Verification response:", response.status, response.ok);

			// Clean URL immediately
			window.history.pushState({}, "", "/");
			setCurrentPage("home");

			if (response.ok) {
				// Success - show login modal with success toast
				console.log("✅ Email verification successful");
				setToast({ message: "Email verified successfully! Please log in.", type: "success" });
				setShowLoginModal(true);
			} else {
				// Error - show login modal with error toast
				const errorData = await response.json();
				console.log("❌ Email verification failed:", errorData);
				setToast({
					message: errorData.detail || "Email verification failed. Please try again.",
					type: "error"
				});
				setShowLoginModal(true);
			}
		} catch (error) {
			// Network error - clean URL and show login with error toast
			console.log("🚨 Network error during verification:", error);
			window.history.pushState({}, "", "/");
			setCurrentPage("home");
			setToast({ message: "Network error during email verification. Please try again.", type: "error" });
			setShowLoginModal(true);
		}
	};

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

	// Google OAuth registration handler
	const handleSelectGoogleRegistration = async (credential?: string): Promise<void> => {
		if (!credential) {
			console.error("No credential received from Google OAuth");
			return;
		}

		try {
			console.log("Processing Google OAuth credential...");
			// Make API call to backend OAuth endpoint
			const response = await fetch("http://localhost:3000/api/auth/google-oauth", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({ credential })
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.detail || "Google OAuth authentication failed");
			}

			const data = await response.json();
			console.log("Google OAuth successful:", data);

			// Store auth token and update state
			if (data.access_token && data.user) {
				auth.login(data.access_token, {
					email: data.user.email,
					name: `${data.user.first_name} ${data.user.last_name}`,
					has_projects_access: data.user.has_projects_access || false,
					email_verified: data.user.email_verified || false
				});
			}

			// Close registration modal and redirect to dashboard
			setShowRegistrationMethodModal(false);
			setCurrentPage("dashboard");
		} catch (error) {
			console.error("Google OAuth registration failed:", error);
			throw error; // Re-throw to let the modal handle the error display
		}
	};

	const handleCloseEmailRegistration = (): void => {
		setShowEmailRegistrationModal(false);
	};

	const handleEmailRegistrationSuccess = (): void => {
		setShowEmailRegistrationModal(false);
		// Registration success - user will check email and then manually navigate to login
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

	// Show email verification banner for authenticated users with unverified emails
	const showEmailVerificationBanner = auth.isAuthenticated && auth.user && !auth.user.email_verified;

	return (
		<div className="flex min-h-screen flex-col">
			<Header
				currentPage={currentPage}
				onPageChange={setCurrentPage}
				onShowRegistration={handleShowRegistration}
				onShowLogin={handleShowLogin}
				auth={auth}
			/>
			{showEmailVerificationBanner && (
				<EmailVerificationStatusBanner userEmail={auth.user!.email} isVisible={true} />
			)}
			{renderPage()}
			<footer className="border-layout-background bg-layout-background text-text-primary mt-auto border-t px-8 py-6 text-center text-sm">
				<p className="m-0 mx-auto max-w-[3840px]">&copy; 2025 Zentropy. All rights reserved.</p>
			</footer>

			{showRegistrationMethodModal && (
				<RegistrationMethodModal
					isOpen={showRegistrationMethodModal}
					onClose={handleCloseRegistrationMethod}
					onSelectEmail={handleSelectEmailRegistration}
					onSelectGoogle={handleSelectGoogleRegistration}
				/>
			)}

			<EmailRegistrationModal
				isOpen={showEmailRegistrationModal}
				onClose={handleCloseEmailRegistration}
				onSuccess={handleEmailRegistrationSuccess}
			/>

			<LoginModal isOpen={showLoginModal} onClose={handleCloseLogin} onSuccess={handleLoginSuccess} auth={auth} />

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
