import React, { useState, useRef, useEffect } from "react";

type Page =
	| "home"
	| "about"
	| "contact"
	| "profile"
	| "teams"
	| "calendar"
	| "dashboard"
	| "login"
	| "register"
	| "team-configuration";

interface AuthUser {
	email: string;
	name: string;
}

interface Auth {
	isAuthenticated: boolean;
	user: AuthUser | null;
	token: string | null;
	login: (token: string, user: AuthUser) => void;
	logout: () => Promise<void>;
}

interface ProfileDropdownProps {
	onPageChange: (page: Page) => void;
	auth: Auth;
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ onPageChange, auth }) => {
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const toggleRef = useRef<HTMLButtonElement>(null);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent): void => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};

		const handleEscapeKey = (event: KeyboardEvent): void => {
			if (event.key === "Escape") {
				setIsOpen(false);
				toggleRef.current?.focus();
			}
		};

		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
			document.addEventListener("keydown", handleEscapeKey);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleEscapeKey);
		};
	}, [isOpen]);

	const handleToggle = (): void => {
		setIsOpen(!isOpen);
	};

	const handleMenuItemClick = (page: Page): void => {
		setIsOpen(false);
		onPageChange(page);
	};

	const handleLogout = async (): Promise<void> => {
		setIsOpen(false);
		try {
			await auth.logout();
			// Redirect to home page after successful logout
			onPageChange("home");
		} catch (error) {
			console.error("Logout error:", error);
			// Still redirect even if API call fails since we cleared local state
			onPageChange("home");
		}
	};

	return (
		<div className="relative" ref={dropdownRef}>
			<button
				ref={toggleRef}
				className="mr-3 flex h-10 w-10 cursor-pointer items-center justify-center rounded-md border-none bg-transparent p-2 text-text-primary transition-all duration-200 hover:bg-interactive-hover hover:text-text-primary focus:outline-2 focus:outline-offset-2 focus:outline-interactive"
				type="button"
				aria-expanded={isOpen}
				aria-haspopup="true"
				onClick={handleToggle}
				aria-label="Profile menu"
			>
				<svg
					className="text-text-primary transition-colors duration-200 hover:text-text-primary"
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="currentColor"
				>
					<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
				</svg>
			</button>

			{isOpen && (
				<>
					<button
						className="fixed top-4 right-12 z-[1001] flex h-10 w-10 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-text-primary transition-all duration-200 hover:bg-interactive-hover hover:text-text-primary focus:outline-2 focus:outline-offset-2 focus:outline-interactive"
						onClick={() => setIsOpen(false)}
						aria-label="Close profile menu"
					>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
							<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
						</svg>
					</button>
					<div
						className="fixed top-0 left-0 z-[999] h-screen w-full bg-transparent"
						onClick={() => setIsOpen(false)}
						onKeyDown={e => {
							if (e.key === "Enter" || e.key === " ") {
								setIsOpen(false);
							}
						}}
						role="button"
						tabIndex={0}
						aria-label="Close menu overlay"
					></div>
					<div
						className="visible fixed top-0 right-0 z-[1000] h-screen w-80 translate-x-0 overflow-y-auto border-l border-layout-background bg-content-background opacity-100 shadow-lg transition-all duration-[600ms] ease-out"
						role="menu"
					>
						<div className="flex items-center gap-3 border-b border-layout-background bg-layout-background p-8">
							<div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-layout-background text-text-primary">
								<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
									<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
								</svg>
							</div>
							<div className="min-w-0 flex-grow">
								<div className="text-sm font-semibold text-text-contrast">
									{auth.user?.name || "Guest User"}
								</div>
								<div className="mt-0.5 overflow-hidden text-xs text-ellipsis whitespace-nowrap text-text-primary">
									{auth.user?.email || "Not signed in"}
								</div>
							</div>
						</div>

						<div className="my-2 h-px bg-layout-background"></div>

						<button
							className="flex w-full cursor-pointer items-center gap-3 border-none bg-transparent p-4 px-8 text-sm text-text-primary no-underline transition-colors duration-200 hover:bg-interactive-hover hover:text-text-primary focus:bg-interactive-hover focus:outline-none"
							role="menuitem"
							onClick={() => handleMenuItemClick("profile")}
						>
							<svg
								className="flex-shrink-0 text-text-primary"
								width="18"
								height="18"
								viewBox="0 0 24 24"
								fill="currentColor"
							>
								<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
							</svg>
							<span>My Profile</span>
						</button>

						<button
							className="flex w-full cursor-pointer items-center gap-3 border-none bg-transparent p-4 px-8 text-sm text-text-primary no-underline transition-colors duration-200 hover:bg-interactive-hover hover:text-text-primary focus:bg-interactive-hover focus:outline-none"
							role="menuitem"
							onClick={() => handleMenuItemClick("teams")}
						>
							<svg
								className="flex-shrink-0 text-text-primary"
								width="18"
								height="18"
								viewBox="0 0 24 24"
								fill="currentColor"
							>
								<path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zM4 18v-4h3v4h2v-7H7v2H4V8h3V7H2v11h2zm11-1c-1.11 0-2-.89-2-2s.89-2 2-2 2 .89 2 2-.89 2-2 2zm-1-9v3h2v-3h-2z" />
							</svg>
							<span>My Teams</span>
						</button>

						<button
							className="flex w-full cursor-pointer items-center gap-3 border-none bg-transparent p-4 px-8 text-sm text-text-primary no-underline transition-colors duration-200 hover:bg-interactive-hover hover:text-text-primary focus:bg-interactive-hover focus:outline-none"
							role="menuitem"
							onClick={() => handleMenuItemClick("calendar")}
						>
							<svg
								className="flex-shrink-0 text-text-primary"
								width="18"
								height="18"
								viewBox="0 0 24 24"
								fill="currentColor"
							>
								<path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
							</svg>
							<span>Calendar</span>
						</button>

						<button
							className="flex w-full cursor-pointer items-center gap-3 border-none bg-transparent p-4 px-8 text-sm text-text-primary no-underline transition-colors duration-200 hover:bg-interactive-hover hover:text-text-primary focus:bg-interactive-hover focus:outline-none"
							role="menuitem"
							onClick={() => handleMenuItemClick("dashboard")}
						>
							<svg
								className="flex-shrink-0 text-text-primary"
								width="18"
								height="18"
								viewBox="0 0 24 24"
								fill="currentColor"
							>
								<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
							</svg>
							<span>Dashboard</span>
						</button>

						<button
							className="flex w-full cursor-pointer items-center gap-3 border-none bg-transparent p-4 px-8 text-sm text-text-primary no-underline transition-colors duration-200 hover:bg-interactive-hover hover:text-text-primary focus:bg-interactive-hover focus:outline-none"
							role="menuitem"
							onClick={() => handleMenuItemClick("team-configuration")}
						>
							<svg
								className="flex-shrink-0 text-text-primary"
								width="18"
								height="18"
								viewBox="0 0 24 24"
								fill="currentColor"
							>
								<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
							</svg>
							<span>Team Configuration</span>
						</button>

						<div className="my-2 h-px bg-layout-background"></div>

						<button
							className="flex w-full cursor-pointer items-center gap-3 border-none bg-transparent p-4 px-8 text-sm text-text-primary no-underline transition-colors duration-200 hover:bg-interactive-hover hover:text-text-primary focus:bg-interactive-hover focus:outline-none"
							role="menuitem"
							onClick={() => handleMenuItemClick("login")}
						>
							<svg
								className="flex-shrink-0 text-text-primary"
								width="18"
								height="18"
								viewBox="0 0 24 24"
								fill="currentColor"
							>
								<path d="M11 7L9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5-5-5zm9 12h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-8v2h8v14z" />
							</svg>
							<span>Login</span>
						</button>

						<button
							className="flex w-full cursor-pointer items-center gap-3 border-none bg-transparent p-4 px-8 text-sm text-text-primary no-underline transition-colors duration-200 hover:bg-interactive-hover hover:text-text-primary focus:bg-interactive-hover focus:outline-none"
							role="menuitem"
							onClick={() => handleMenuItemClick("register")}
						>
							<svg
								className="flex-shrink-0 text-text-primary"
								width="18"
								height="18"
								viewBox="0 0 24 24"
								fill="currentColor"
							>
								<path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
							</svg>
							<span>Register</span>
						</button>

						<div className="my-2 h-px bg-layout-background"></div>

						<button
							className="flex w-full cursor-pointer items-center gap-3 border-none bg-transparent p-4 px-8 text-sm text-red-600 no-underline transition-colors duration-200 hover:bg-red-50 hover:text-red-700 focus:bg-red-50 focus:outline-none"
							role="menuitem"
							onClick={() => void handleLogout()}
						>
							<svg
								className="flex-shrink-0 text-red-600"
								width="18"
								height="18"
								viewBox="0 0 24 24"
								fill="currentColor"
							>
								<path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
							</svg>
							<span>Sign Out</span>
						</button>
					</div>
				</>
			)}
		</div>
	);
};

export default ProfileDropdown;
