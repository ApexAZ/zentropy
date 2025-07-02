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
	| "register"
	| "team-configuration";

interface HeaderProps {
	currentPage: Page;
	onPageChange: (page: Page) => void;
}

const Header: React.FC<HeaderProps> = ({ currentPage, onPageChange }) => {
	return (
		<header className="flex w-full items-center justify-between border-b border-gray-200 bg-white px-8 py-4 shadow-sm">
			<h1 className="m-0 flex-shrink-0 text-3xl">
				<button
					onClick={() => onPageChange("home")}
					className="cursor-pointer border-none bg-transparent p-0 text-3xl font-bold text-blue-500 no-underline"
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
									? "bg-gray-50 text-blue-500"
									: "text-gray-600 hover:bg-gray-50 hover:text-blue-500"
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
									? "bg-gray-50 text-blue-500"
									: "text-gray-600 hover:bg-gray-50 hover:text-blue-500"
							}`}
							onClick={() => onPageChange("contact")}
						>
							Contact
						</button>
					</li>
				</ul>
				<div className="nav-auth">
					<ProfileDropdown onPageChange={onPageChange} />
				</div>
			</nav>
		</header>
	);
};

export default Header;
