import React from "react";
import NavigationPanel from "./NavigationPanel";
import FlyoutNavigation from "./FlyoutNavigation";
import EmailVerificationResendButton from "./EmailVerificationResendButton";
import type { AuthUser } from "../types";

type Page = "home" | "about" | "contact" | "profile" | "teams" | "calendar" | "dashboard" | "team-configuration";

interface Auth {
	isAuthenticated: boolean;
	user: AuthUser | null;
	token: string | null;
	login: (token: string, user: AuthUser) => void;
	logout: () => Promise<void>;
}

interface HeaderProps {
	currentPage: Page;
	onPageChange: (page: Page) => void;
	onShowRegistration: () => void;
	onShowSignIn: () => void;
	auth: Auth;
}

const Header: React.FC<HeaderProps> = ({ currentPage, onPageChange, onShowRegistration, onShowSignIn, auth }) => {
	return (
		<header className="border-layout-background bg-content-background flex w-full items-center border-b px-8 py-4 shadow-sm">
			{/* Left side - Flyout navigation */}
			<div className="flex flex-1 items-center">
				<FlyoutNavigation currentPage={currentPage} onPageChange={onPageChange} />
			</div>

			{/* Center - Zentropy logo */}
			<h1 className="m-0 flex-shrink-0 text-3xl">
				<button
					onClick={() => onPageChange("home")}
					className="text-interactive cursor-pointer border-none bg-transparent p-0 text-3xl font-bold no-underline"
				>
					Zentropy
				</button>
			</h1>

			{/* Right side - Email verification + Auth navigation */}
			<div className="flex flex-1 items-center justify-end gap-4">
				{/* Email verification notice */}
				{auth.isAuthenticated && auth.user && !auth.user.email_verified && (
					<div className="flex items-center gap-3">
						<span className="text-warning text-lg font-medium">Email verification required</span>
						<EmailVerificationResendButton userEmail={auth.user.email} />
					</div>
				)}

				<NavigationPanel
					onPageChange={onPageChange}
					onShowRegistration={onShowRegistration}
					onShowSignIn={onShowSignIn}
					auth={auth}
				/>
			</div>
		</header>
	);
};

export default Header;
