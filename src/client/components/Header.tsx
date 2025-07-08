import React from "react";
import NavigationPanel from "./NavigationPanel";
import type { AuthUser } from '../types';

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
		<header className="border-layout-background bg-content-background flex w-full items-center justify-between border-b px-8 py-4 shadow-sm">
			<h1 className="m-0 flex-shrink-0 text-3xl">
				<button
					onClick={() => onPageChange("home")}
					className="text-interactive cursor-pointer border-none bg-transparent p-0 text-3xl font-bold no-underline"
				>
					Zentropy
				</button>
			</h1>
			<nav id="nav-container" className="flex flex-grow items-center justify-end">
				<ul className="m-0 mr-4 flex list-none gap-6 p-0">
					<li>
						<a
							className={`cursor-pointer text-base font-medium no-underline transition-all duration-200 ${
								currentPage === "about"
									? "text-interactive border-interactive border-b"
									: "text-interactive hover:text-interactive-hover hover:border-interactive-hover hover:border-b"
							}`}
							onClick={() => onPageChange("about")}
							role="button"
							tabIndex={0}
							onKeyDown={e => {
								if (e.key === "Enter" || e.key === " ") {
									onPageChange("about");
								}
							}}
						>
							About
						</a>
					</li>
					<li>
						<a
							className={`cursor-pointer text-base font-medium no-underline transition-all duration-200 ${
								currentPage === "contact"
									? "text-interactive border-interactive border-b"
									: "text-interactive hover:text-interactive-hover hover:border-interactive-hover hover:border-b"
							}`}
							onClick={() => onPageChange("contact")}
							role="button"
							tabIndex={0}
							onKeyDown={e => {
								if (e.key === "Enter" || e.key === " ") {
									onPageChange("contact");
								}
							}}
						>
							Contact
						</a>
					</li>
				</ul>
				<div className="nav-auth">
					<NavigationPanel
						onPageChange={onPageChange}
						onShowRegistration={onShowRegistration}
						onShowSignIn={onShowSignIn}
						auth={auth}
					/>
				</div>
			</nav>
		</header>
	);
};

export default Header;
