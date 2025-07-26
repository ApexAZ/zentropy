import React from "react";

interface TabListProps {
	/** Current active tab ID */
	activeTab: string;
	/** Handler for tab selection */
	onTabChange: (tabId: string) => void;
	/** Tab items configuration */
	children: React.ReactNode;
	/** Additional CSS classes */
	className?: string;
}

interface TabProps {
	/** Unique tab identifier */
	id: string;
	/** Tab display label */
	label: string;
	/** Whether this tab is currently active */
	isActive: boolean;
	/** Click handler */
	onClick: (tabId: string) => void;
	/** Additional CSS classes */
	className?: string;
}

interface TabPanelProps {
	/** Tab ID this panel corresponds to */
	tabId: string;
	/** Current active tab ID */
	activeTab: string;
	/** Panel content */
	children: React.ReactNode;
	/** Additional CSS classes */
	className?: string;
}

/**
 * Tab List Component
 *
 * Container for tab navigation following atomic design patterns.
 * Provides keyboard navigation and accessibility support.
 */
export function TabList({ onTabChange, children, className = "" }: TabListProps) {
	const handleKeyDown = (event: React.KeyboardEvent) => {
		const tabs = Array.from(event.currentTarget.querySelectorAll('[role="tab"]'));
		const currentIndex = tabs.findIndex(tab => tab.getAttribute("aria-selected") === "true");

		let newIndex = currentIndex;

		switch (event.key) {
			case "ArrowLeft":
				event.preventDefault();
				newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
				break;
			case "ArrowRight":
				event.preventDefault();
				newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
				break;
			case "Home":
				event.preventDefault();
				newIndex = 0;
				break;
			case "End":
				event.preventDefault();
				newIndex = tabs.length - 1;
				break;
			default:
				return;
		}

		const targetTab = tabs[newIndex] as HTMLElement;
		const tabId = targetTab.getAttribute("data-tab-id");
		if (tabId) {
			onTabChange(tabId);
			targetTab.focus();
		}
	};

	return (
		<div role="tablist" className={`border-layout-background flex border-b ${className}`} onKeyDown={handleKeyDown}>
			{children}
		</div>
	);
}

/**
 * Tab Component
 *
 * Individual tab button following atomic design patterns.
 * Includes accessibility attributes and hover states.
 */
export function Tab({ id, label, isActive, onClick, className = "" }: TabProps) {
	const handleClick = () => {
		onClick(id);
	};

	const handleKeyDown = (event: React.KeyboardEvent) => {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			onClick(id);
		}
	};

	return (
		<button
			role="tab"
			tabIndex={isActive ? 0 : -1}
			aria-selected={isActive}
			aria-controls={`tabpanel-${id}`}
			data-tab-id={id}
			onClick={handleClick}
			onKeyDown={handleKeyDown}
			className={`text-text-primary hover:text-text-contrast focus:text-text-contrast hover:border-interactive focus:border-interactive focus:ring-interactive/20 border-b-2 px-4 py-3 font-medium transition-all duration-200 focus:ring-2 focus:outline-none ${
				isActive ? "text-contrast border-interactive" : "border-transparent"
			} ${className} `}
		>
			{label}
		</button>
	);
}

/**
 * Tab Panel Component
 *
 * Content container for tab panels following atomic design patterns.
 * Handles visibility and accessibility attributes.
 */
export function TabPanel({ tabId, activeTab, children, className = "" }: TabPanelProps) {
	const isActive = tabId === activeTab;

	if (!isActive) {
		return null;
	}

	return (
		<div
			role="tabpanel"
			id={`tabpanel-${tabId}`}
			aria-labelledby={`tab-${tabId}`}
			tabIndex={0}
			className={`focus:outline-none ${className}`}
		>
			{children}
		</div>
	);
}
