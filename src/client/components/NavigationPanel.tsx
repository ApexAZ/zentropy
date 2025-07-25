import React, { useState, useRef, useEffect } from "react";
import { logger } from "../utils/logger";
import type { AuthUser } from "../types";

type Page = "home" | "about" | "contact" | "profile" | "teams" | "calendar" | "dashboard" | "team-configuration";

interface Auth {
	/** Current authentication status */
	isAuthenticated: boolean;
	/** Currently authenticated user data, null if not authenticated */
	user: AuthUser | null;
	/** JWT authentication token, null if not authenticated */
	token: string | null;
	/** Function to log in user with token and user data */
	login: (token: string, user: AuthUser) => void;
	/** Function to log out current user */
	logout: () => Promise<void>;
}

interface NavigationPanelProps {
	/** Called when user navigates to a different page */
	onPageChange: (page: Page) => void;
	/** Called when user wants to show registration modal */
	onShowRegistration: () => void;
	/** Called when user wants to show sign-in modal */
	onShowSignIn: () => void;
	/** Authentication state and methods from useAuth hook */
	auth: Auth;
	/** Pending verification state to show contextual messaging */
	pendingVerification?: { email: string; timestamp: number } | null;
}

const NavigationPanel: React.FC<NavigationPanelProps> = ({
	onPageChange,
	onShowRegistration,
	onShowSignIn,
	auth,
	pendingVerification
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const [isProjectsExpanded, setIsProjectsExpanded] = useState(false);
	const panelRef = useRef<HTMLDivElement>(null);
	const toggleRef = useRef<HTMLButtonElement>(null);

	// Close navigation panel when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent): void => {
			if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
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

	const handleProjectsToggle = (): void => {
		setIsProjectsExpanded(!isProjectsExpanded);
	};

	const handleShowSignIn = (): void => {
		setIsOpen(false);
		onShowSignIn();
	};

	const handleShowRegistration = (): void => {
		setIsOpen(false);
		onShowRegistration();
	};

	const handleLogout = async (): Promise<void> => {
		setIsOpen(false);
		try {
			await auth.logout();
			// Redirect to home page after successful logout
			onPageChange("home");
		} catch (error) {
			logger.error("Logout error", { error });
			// Still redirect even if API call fails since we cleared local state
			onPageChange("home");
		}
	};

	return (
		<div className="relative" ref={panelRef}>
			{/* Person icon - clickable for all users */}
			<button
				ref={toggleRef}
				className="focus:outline-interactive mr-1 flex h-12 w-12 cursor-pointer items-center justify-center border-none bg-transparent p-1 transition-all duration-200 hover:-translate-y-px focus:outline-2 focus:outline-offset-1"
				type="button"
				aria-expanded={isOpen}
				aria-haspopup="true"
				onClick={handleToggle}
				aria-label="Profile menu"
			>
				<svg
					className="text-interactive hover:text-interactive-hover transition-colors duration-200"
					width="30"
					height="30"
					viewBox="0 0 24 24"
					fill="currentColor"
				>
					<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
				</svg>
			</button>

			{isOpen && (
				<>
					<button
						className="text-interactive hover:text-interactive-hover focus:outline-interactive fixed top-[15px] right-[15px] z-[1001] flex h-12 w-12 cursor-pointer items-center justify-center border-none bg-transparent p-1 transition-colors duration-200 focus:outline-2 focus:outline-offset-1"
						onClick={() => setIsOpen(false)}
						aria-label="Close profile menu"
					>
						<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
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
						className="border-layout-background bg-content-background visible fixed top-0 right-0 z-[1000] h-screen w-80 translate-x-0 overflow-y-auto border-l opacity-100 shadow-lg transition-all duration-[600ms] ease-out"
						role="menu"
					>
						<div className="border-layout-background bg-layout-background border-b p-8">
							{auth.isAuthenticated ? (
								<div className="group relative">
									<div
										className="flex w-full transform cursor-pointer items-center gap-3 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0.5"
										onClick={() => handleMenuItemClick("profile")}
										role="button"
										tabIndex={0}
										aria-label="Go to profile"
										onKeyDown={e => {
											if (e.key === "Enter" || e.key === " ") {
												e.preventDefault();
												handleMenuItemClick("profile");
											}
										}}
									>
										<div className="bg-layout-background flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full">
											<svg
												className="text-interactive group-hover:text-interactive-hover transition-colors duration-200"
												width="30"
												height="30"
												viewBox="0 0 24 24"
												fill="currentColor"
											>
												<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
											</svg>
										</div>
										<div className="min-w-0 flex-grow select-none">
											<div className="text-text-contrast text-sm font-semibold">
												{auth.user?.name}
											</div>
											<div className="text-text-primary mt-0.5 overflow-hidden text-xs text-ellipsis whitespace-nowrap">
												{auth.user?.email}
											</div>
										</div>
									</div>
									<div className="bg-neutral pointer-events-none absolute -top-8 left-1/2 z-50 -translate-x-1/2 transform rounded px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
										Profile
									</div>
								</div>
							) : (
								<div className="flex items-center gap-3">
									<div className="bg-layout-background text-interactive flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full">
										<svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor">
											<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
										</svg>
									</div>
									<div className="min-w-0 flex-grow">
										<div className="-ml-3 flex items-center gap-1">
											{pendingVerification ? (
												<div className="text-warning w-full text-center text-sm font-medium">
													Please verify your email
												</div>
											) : (
												<>
													<button
														className="text-interactive hover:text-interactive-hover focus:outline-interactive flex items-center gap-1.5 border-none bg-transparent px-1.5 py-1 text-sm font-medium transition-colors duration-200 focus:outline-2 focus:outline-offset-2"
														onClick={handleShowSignIn}
														aria-label="Sign in"
													>
														<svg
															width="13"
															height="13"
															viewBox="0 0 24 24"
															fill="currentColor"
														>
															<path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
														</svg>
														Sign in
													</button>
													<button
														className="text-interactive hover:text-interactive-hover focus:outline-interactive flex items-center gap-1.5 border-none bg-transparent px-1.5 py-1 text-sm font-medium transition-colors duration-200 focus:outline-2 focus:outline-offset-2"
														onClick={handleShowRegistration}
														aria-label="Register"
													>
														<svg
															width="13"
															height="13"
															viewBox="0 0 24 24"
															fill="currentColor"
														>
															<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
														</svg>
														Register
													</button>
												</>
											)}
										</div>
									</div>
								</div>
							)}
						</div>

						<div className="bg-layout-background my-2 h-px"></div>

						{auth.isAuthenticated && (
							<>
								{auth.user?.has_projects_access && (
									<>
										{/* Projects Section - Expandable */}
										<button
											className="text-text-primary hover:bg-interactive-hover hover:text-text-primary focus:bg-interactive-hover flex w-full cursor-pointer items-center justify-between border-none bg-transparent p-4 px-8 text-sm no-underline transition-colors duration-200 focus:outline-none"
											role="menuitem"
											onClick={handleProjectsToggle}
											aria-expanded={isProjectsExpanded}
										>
											<div className="flex items-center gap-3">
												<svg
													className="text-icon-projects flex-shrink-0"
													width="18"
													height="18"
													viewBox="0 0 24 24"
													fill="currentColor"
												>
													<path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14l-5-5 1.41-1.41L14 14.17l3.59-3.58L19 12l-5 5z" />
												</svg>
												<span>Projects</span>
											</div>
											<svg
												className={`text-text-primary transition-transform duration-200 ${
													isProjectsExpanded ? "rotate-90" : ""
												}`}
												width="16"
												height="16"
												viewBox="0 0 24 24"
												fill="currentColor"
											>
												<path d="M9 5l7 7-7 7V5z" />
											</svg>
										</button>

										{/* Projects Sub-menu */}
										{isProjectsExpanded && (
											<div className="bg-layout-background">
												<button
													className="text-text-primary hover:bg-interactive-hover hover:text-text-primary focus:bg-interactive-hover flex w-full cursor-pointer items-center gap-3 border-none bg-transparent py-3 pr-8 pl-12 text-sm no-underline transition-colors duration-200 focus:outline-none"
													role="menuitem"
													onClick={() => handleMenuItemClick("teams")}
												>
													<svg
														className="text-icon-projects flex-shrink-0"
														width="16"
														height="16"
														viewBox="0 0 24 24"
														fill="currentColor"
													>
														<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
													</svg>
													<span>Create Project</span>
												</button>

												<button
													className="text-text-primary hover:bg-interactive-hover hover:text-text-primary focus:bg-interactive-hover flex w-full cursor-pointer items-center gap-3 border-none bg-transparent py-3 pr-8 pl-12 text-sm no-underline transition-colors duration-200 focus:outline-none"
													role="menuitem"
													onClick={() => handleMenuItemClick("teams")}
												>
													<svg
														className="text-icon-projects flex-shrink-0"
														width="16"
														height="16"
														viewBox="0 0 24 24"
														fill="currentColor"
													>
														<path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
													</svg>
													<span>Join Project</span>
												</button>
											</div>
										)}

										<button
											className="text-text-primary hover:bg-interactive-hover hover:text-text-primary focus:bg-interactive-hover flex w-full cursor-pointer items-center gap-3 border-none bg-transparent p-4 px-8 text-sm no-underline transition-colors duration-200 focus:outline-none"
											role="menuitem"
											onClick={() => handleMenuItemClick("teams")}
										>
											<svg
												className="text-icon-teams flex-shrink-0"
												width="18"
												height="18"
												viewBox="0 0 24 24"
												fill="currentColor"
											>
												<path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
											</svg>
											<span>Teams</span>
										</button>

										<button
											className="text-text-primary hover:bg-interactive-hover hover:text-text-primary focus:bg-interactive-hover flex w-full cursor-pointer items-center gap-3 border-none bg-transparent p-4 px-8 text-sm no-underline transition-colors duration-200 focus:outline-none"
											role="menuitem"
											onClick={() => handleMenuItemClick("calendar")}
										>
											<svg
												className="text-icon-calendar flex-shrink-0"
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
											className="text-text-primary hover:bg-interactive-hover hover:text-text-primary focus:bg-interactive-hover flex w-full cursor-pointer items-center gap-3 border-none bg-transparent p-4 px-8 text-sm no-underline transition-colors duration-200 focus:outline-none"
											role="menuitem"
											onClick={() => handleMenuItemClick("dashboard")}
										>
											<svg
												className="text-icon-dashboard flex-shrink-0"
												width="18"
												height="18"
												viewBox="0 0 24 24"
												fill="currentColor"
											>
												<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
											</svg>
											<span>Dashboard</span>
										</button>

										<button
											className="text-text-primary hover:bg-interactive-hover hover:text-text-primary focus:bg-interactive-hover flex w-full cursor-pointer items-center gap-3 border-none bg-transparent p-4 px-8 text-sm no-underline transition-colors duration-200 focus:outline-none"
											role="menuitem"
											onClick={() => handleMenuItemClick("team-configuration")}
										>
											<svg
												className="text-icon-teams flex-shrink-0"
												width="18"
												height="18"
												viewBox="0 0 24 24"
												fill="currentColor"
											>
												<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
											</svg>
											<span>Team Configuration</span>
										</button>
									</>
								)}

								<div className="bg-layout-background my-2 h-px"></div>
							</>
						)}

						{auth.isAuthenticated && (
							<button
								className="text-error hover:bg-error-background hover:text-error focus:bg-error-background flex w-full cursor-pointer items-center gap-3 border-none bg-transparent p-4 px-8 text-sm no-underline transition-colors duration-200 focus:outline-none"
								role="menuitem"
								onClick={() => void handleLogout()}
							>
								<svg
									className="text-error flex-shrink-0"
									width="18"
									height="18"
									viewBox="0 0 24 24"
									fill="currentColor"
								>
									<path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
								</svg>
								<span>Sign Out</span>
							</button>
						)}
					</div>
				</>
			)}
		</div>
	);
};

export default NavigationPanel;
