import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Toast } from "../components/atoms/Toast";

export interface ToastActionLink {
	text: string;
	onClick: () => void;
}

export interface ToastMessage {
	id: string;
	message: string;
	type: "success" | "error" | "info" | "warning" | "critical-error";
	autoDissmissTimeout?: number;
	persistent?: boolean;
	actionLink?: ToastActionLink;
}

export interface ToastContextType {
	/** Show a toast notification */
	showToast: (
		message: string,
		type: ToastMessage["type"],
		options?: {
			autoDissmissTimeout?: number;
			persistent?: boolean;
			actionLink?: ToastActionLink;
		}
	) => void;
	/** Show a success toast */
	showSuccess: (message: string, autoDissmissTimeout?: number) => void;
	/** Show an error toast */
	showError: (message: string, autoDissmissTimeout?: number) => void;
	/** Show an info toast */
	showInfo: (message: string, autoDissmissTimeout?: number) => void;
	/** Show a warning toast */
	showWarning: (message: string, autoDissmissTimeout?: number) => void;
	/** Show a critical error toast (persistent by default) */
	showCriticalError: (message: string, actionLink?: ToastActionLink) => void;
	/** Show a persistent toast (doesn't auto-dismiss) */
	showPersistent: (message: string, type: ToastMessage["type"], actionLink?: ToastActionLink) => void;
	/** Dismiss a specific toast */
	dismissToast: (id: string) => void;
	/** Dismiss all toasts */
	dismissAllToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export interface ToastProviderProps {
	children: ReactNode;
	/** Maximum number of toasts to show at once */
	maxToasts?: number;
}

/**
 * Toast Provider Component
 *
 * Provides centralized toast notification management for the application.
 * Handles multiple toasts with automatic stacking and dismissal.
 */
export function ToastProvider({ children, maxToasts = 5 }: ToastProviderProps) {
	const [toasts, setToasts] = useState<ToastMessage[]>([]);

	// Generate unique ID for toasts
	const generateId = useCallback(() => {
		return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}, []);

	// Add a new toast
	const showToast = useCallback(
		(
			message: string,
			type: ToastMessage["type"],
			options?: {
				autoDissmissTimeout?: number;
				persistent?: boolean;
				actionLink?: ToastActionLink;
			}
		) => {
			const newToast: ToastMessage = {
				id: generateId(),
				message,
				type,
				...(options?.autoDissmissTimeout !== undefined && { autoDissmissTimeout: options.autoDissmissTimeout }),
				...(options?.persistent && { persistent: options.persistent }),
				...(options?.actionLink && { actionLink: options.actionLink })
			};

			setToasts(prev => {
				const updated = [...prev, newToast];
				// Remove oldest toasts if we exceed the limit
				return updated.length > maxToasts ? updated.slice(-maxToasts) : updated;
			});
		},
		[generateId, maxToasts]
	);

	// Convenience methods for different toast types
	const showSuccess = useCallback(
		(message: string, autoDissmissTimeout?: number) => {
			showToast(message, "success", autoDissmissTimeout !== undefined ? { autoDissmissTimeout } : undefined);
		},
		[showToast]
	);

	const showError = useCallback(
		(message: string, autoDissmissTimeout?: number) => {
			showToast(message, "error", autoDissmissTimeout !== undefined ? { autoDissmissTimeout } : undefined);
		},
		[showToast]
	);

	const showInfo = useCallback(
		(message: string, autoDissmissTimeout?: number) => {
			showToast(message, "info", autoDissmissTimeout !== undefined ? { autoDissmissTimeout } : undefined);
		},
		[showToast]
	);

	const showWarning = useCallback(
		(message: string, autoDissmissTimeout?: number) => {
			showToast(message, "warning", autoDissmissTimeout !== undefined ? { autoDissmissTimeout } : undefined);
		},
		[showToast]
	);

	// Critical error toast (persistent by default)
	const showCriticalError = useCallback(
		(message: string, actionLink?: ToastActionLink) => {
			showToast(message, "critical-error", {
				persistent: true,
				...(actionLink && { actionLink })
			});
		},
		[showToast]
	);

	// Persistent toast (doesn't auto-dismiss)
	const showPersistent = useCallback(
		(message: string, type: ToastMessage["type"], actionLink?: ToastActionLink) => {
			showToast(message, type, {
				persistent: true,
				...(actionLink && { actionLink })
			});
		},
		[showToast]
	);

	// Dismiss a specific toast
	const dismissToast = useCallback((id: string) => {
		setToasts(prev => prev.filter(toast => toast.id !== id));
	}, []);

	// Dismiss all toasts
	const dismissAllToasts = useCallback(() => {
		setToasts([]);
	}, []);

	const contextValue: ToastContextType = {
		showToast,
		showSuccess,
		showError,
		showInfo,
		showWarning,
		showCriticalError,
		showPersistent,
		dismissToast,
		dismissAllToasts
	};

	return (
		<ToastContext.Provider value={contextValue}>
			{children}
			{/* Render toasts */}
			{toasts.map((toast, index) => (
				<div
					key={toast.id}
					className="transition-transform duration-300 ease-in-out"
					style={{
						transform: `translateY(${index * 80}px)`,
						zIndex: 1100 - index
					}}
				>
					<Toast
						message={toast.message}
						type={toast.type}
						isVisible={true}
						onDismiss={() => dismissToast(toast.id)}
						autoDissmissTimeout={toast.persistent ? 0 : toast.autoDissmissTimeout || 5000}
						{...(toast.actionLink && { actionLink: toast.actionLink })}
					/>
				</div>
			))}
		</ToastContext.Provider>
	);
}

/**
 * Hook to use toast notifications
 *
 * @returns Toast context with methods to show and dismiss toasts
 */
export function useToast(): ToastContextType {
	const context = useContext(ToastContext);
	if (context === undefined) {
		throw new Error("useToast must be used within a ToastProvider");
	}
	return context;
}

export default ToastProvider;
