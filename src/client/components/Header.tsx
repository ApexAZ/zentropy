import React from "react";
import ProfileDropdown from "./ProfileDropdown";

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

interface HeaderProps {
	currentPage: Page;
	onPageChange: (page: Page) => void;
	onShowRegistration: () => void;
	auth: Auth;
}

const Header: React.FC<HeaderProps> = ({ currentPage, onPageChange, onShowRegistration, auth }) => {
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
				<ul className="m-0 flex list-none gap-8 p-0">
					<li>
						<button
							className={`cursor-pointer rounded-md border-none px-4 py-2 font-medium no-underline transition-all duration-200 ${
								currentPage === "about"
									? "bg-layout-background text-interactive"
									: "text-text-primary hover:bg-layout-background hover:text-interactive"
							}`}
							onClick={() => onPageChange("about")}
						>
							About
						</button>
					</li>
					<li>
						<button
							className={`cursor-pointer rounded-md border-none px-4 py-2 font-medium no-underline transition-all duration-200 ${
								currentPage === "contact"
									? "bg-layout-background text-interactive"
									: "text-text-primary hover:bg-layout-background hover:text-interactive"
							}`}
							onClick={() => onPageChange("contact")}
						>
							Contact
						</button>
					</li>
				</ul>
				<div className="nav-auth">
					<ProfileDropdown onPageChange={onPageChange} onShowRegistration={onShowRegistration} auth={auth} />
				</div>
			</nav>
		</header>
	);
};

export default Header;
