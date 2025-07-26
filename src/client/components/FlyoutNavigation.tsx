import React, { useState, useRef, useEffect } from "react";
import Button from "./atoms/Button";

type Page = "home" | "about" | "contact" | "profile" | "teams" | "calendar" | "dashboard" | "team-configuration";

interface FlyoutNavigationProps {
	currentPage: Page;
	onPageChange: (page: Page) => void;
}

const FlyoutNavigation: React.FC<FlyoutNavigationProps> = ({ currentPage, onPageChange }) => {
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent): void => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};

		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isOpen]);

	const handlePageChange = (page: Page): void => {
		onPageChange(page);
		setIsOpen(false);
	};

	return (
		<div className="relative" ref={dropdownRef}>
			{/* Menu button with list icon */}
			<Button
				variant="icon"
				onClick={() => setIsOpen(!isOpen)}
				aria-label="Navigation menu"
				aria-expanded={isOpen}
				aria-haspopup="true"
				className="!text-interactive hover:!text-interactive-hover h-[62px] w-[62px] p-1"
			>
				<svg
					className="h-[36px] w-[36px]"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
				</svg>
			</Button>

			{/* Flyout dropdown */}
			{isOpen && (
				<div className="bg-content-background border-layout-background absolute top-12 left-0 z-50 min-w-48 rounded-md border shadow-lg">
					<nav className="py-2">
						<ul className="m-0 list-none p-0">
							<li>
								<button
									className={`text-text-primary hover:bg-interactive-hover focus:bg-interactive-hover font-interface block w-full cursor-pointer border-none bg-transparent px-4 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 focus:outline-none active:translate-y-0 ${
										currentPage === "about" ? "bg-interactive-hover" : ""
									}`}
									onClick={() => handlePageChange("about")}
								>
									About
								</button>
							</li>
							<li>
								<button
									className={`text-text-primary hover:bg-interactive-hover focus:bg-interactive-hover font-interface block w-full cursor-pointer border-none bg-transparent px-4 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 focus:outline-none active:translate-y-0 ${
										currentPage === "contact" ? "bg-interactive-hover" : ""
									}`}
									onClick={() => handlePageChange("contact")}
								>
									Contact
								</button>
							</li>
						</ul>
					</nav>
				</div>
			)}
		</div>
	);
};

export default FlyoutNavigation;
