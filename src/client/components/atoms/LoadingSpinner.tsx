import React from "react";

interface LoadingSpinnerProps {
	/** Size of the spinner */
	size?: "small" | "medium" | "large";
	/** Text to display alongside the spinner */
	text?: string;
	/** Whether to center the spinner */
	centered?: boolean;
	/** Custom className for styling */
	className?: string;
}

/**
 * Loading Spinner Component
 *
 * Provides consistent loading indicators following the design system.
 * Uses semantic colors and accessibility best practices.
 */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = "medium", text, centered = false, className = "" }) => {
	const sizeClasses = {
		small: "h-4 w-4",
		medium: "h-6 w-6",
		large: "h-8 w-8"
	};

	const textSizeClasses = {
		small: "text-sm",
		medium: "text-base",
		large: "text-lg"
	};

	const spinnerClasses = [
		"border-interactive",
		"animate-spin",
		"rounded-full",
		"border-2",
		"border-t-transparent",
		sizeClasses[size]
	].join(" ");

	const containerClasses = ["flex items-center gap-3", centered ? "justify-center" : "", className]
		.filter(Boolean)
		.join(" ");

	return (
		<div className={containerClasses} role="status" aria-label={text || "Loading"}>
			<div className={spinnerClasses} />
			{text && <span className={`text-primary ${textSizeClasses[size]}`}>{text}</span>}
			<span className="sr-only">{text || "Loading"}</span>
		</div>
	);
};

export default LoadingSpinner;
