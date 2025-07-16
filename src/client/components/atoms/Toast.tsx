import React, { useEffect, useCallback } from "react";

export interface ToastActionLink {
	text: string;
	onClick: () => void;
}

export interface ToastProps {
	/** Message to display */
	message: string;
	/** Toast type for styling */
	type: "success" | "error" | "info" | "warning" | "critical-error";
	/** Whether the toast is visible */
	isVisible: boolean;
	/** Function to dismiss the toast */
	onDismiss: () => void;
	/** Auto-dismiss timeout in milliseconds (default: 5000) */
	autoDissmissTimeout?: number;
	/** Optional action link for user interaction */
	actionLink?: ToastActionLink;
	/** Custom CSS classes */
	className?: string;
}

/**
 * Toast Component
 *
 * Displays temporary notification messages with auto-dismiss functionality.
 * Follows atomic design patterns with accessibility support.
 */
export function Toast({
	message,
	type,
	isVisible,
	onDismiss,
	autoDissmissTimeout = 5000,
	actionLink,
	className = ""
}: ToastProps): React.JSX.Element | null {
	// Auto-dismiss toast after timeout
	useEffect(() => {
		if (isVisible && autoDissmissTimeout > 0) {
			const timer = setTimeout(onDismiss, autoDissmissTimeout);
			return () => clearTimeout(timer);
		}
		return undefined;
	}, [isVisible, autoDissmissTimeout, onDismiss]);

	// Handle escape key to dismiss
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Escape") {
				onDismiss();
			}
		},
		[onDismiss]
	);

	// Don't render if not visible
	if (!isVisible) {
		return null;
	}

	// Type-specific styling following existing patterns
	const typeClasses = {
		success: "border-green-200 bg-green-50 text-green-700",
		error: "border-red-200 bg-red-50 text-red-700",
		info: "border-blue-200 bg-blue-50 text-blue-700",
		warning: "border-yellow-200 bg-yellow-50 text-yellow-700",
		"critical-error": "border-red-500 bg-red-100 text-red-800"
	};

	// Icon for each type
	const typeIcons = {
		success: "✓",
		error: "✕",
		info: "ℹ",
		warning: "⚠",
		"critical-error": "🚨"
	};

	return (
		<div
			className={`animate-slide-in fixed top-5 right-5 z-[1100] max-w-[500px] min-w-[300px] rounded-md shadow-lg ${typeClasses[type]} border ${className} `}
			role="alert"
			aria-live="polite"
			aria-atomic="true"
			onKeyDown={handleKeyDown}
			tabIndex={0}
		>
			<div className="flex items-start gap-3 p-4">
				{/* Type Icon */}
				<div className="flex-shrink-0 text-lg" aria-hidden="true">
					{typeIcons[type]}
				</div>

				{/* Message Content and Action Link */}
				<div className="flex-1">
					<div className="text-sm leading-5">{message}</div>
					{actionLink && (
						<div className="mt-2">
							<button
								onClick={() => {
									actionLink.onClick();
									onDismiss(); // Auto-dismiss after action
								}}
								className="text-sm font-medium underline transition-opacity duration-200 hover:opacity-80 focus:opacity-80"
								type="button"
							>
								{actionLink.text}
							</button>
						</div>
					)}
				</div>

				{/* Dismiss Button */}
				<button
					onClick={onDismiss}
					className="flex-shrink-0 opacity-80 transition-opacity duration-200 hover:opacity-100 focus:opacity-100"
					aria-label="Dismiss notification"
					type="button"
				>
					<span className="text-lg leading-none">&times;</span>
				</button>
			</div>
		</div>
	);
}

export default Toast;
