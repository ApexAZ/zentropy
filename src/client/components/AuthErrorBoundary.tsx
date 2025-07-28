import React, { Component, ErrorInfo, ReactNode } from "react";
import { logger } from "../utils/logger";
import { AccountSecurityErrorHandler } from "../utils/errorHandling";
import Button from "./atoms/Button";

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
	onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
	hasError: boolean;
	error: Error | null;
	errorId: string | null;
}

/**
 * Authentication Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the authentication component tree
 * and displays a user-friendly fallback UI instead of crashing the app.
 *
 * Usage:
 * <AuthErrorBoundary>
 *   <SignInMethods />
 * </AuthErrorBoundary>
 */
export class AuthErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = {
			hasError: false,
			error: null,
			errorId: null
		};
	}

	static getDerivedStateFromError(error: Error): State {
		// Update state so the next render will show the fallback UI
		const errorId = `auth-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

		return {
			hasError: true,
			error,
			errorId
		};
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		// Log the error for debugging and monitoring
		logger.error("Authentication Error Boundary caught an error", {
			error: error.message,
			stack: error.stack,
			componentStack: errorInfo.componentStack,
			errorId: this.state.errorId
		});

		// Call optional error callback
		this.props.onError?.(error, errorInfo);

		// You could also send error reports to an error reporting service here
		// Example: errorReportingService.reportError(error, { errorId: this.state.errorId, context: 'authentication' });
	}

	handleRetry = () => {
		// Reset the error boundary state
		this.setState({
			hasError: false,
			error: null,
			errorId: null
		});
	};

	render() {
		if (this.state.hasError && this.state.error) {
			// Use centralized error handling for consistent user experience
			const errorDetails = AccountSecurityErrorHandler.processError(
				this.state.error.message || "An unexpected error occurred in the authentication system",
				"loading"
			);

			// Custom fallback UI
			if (this.props.fallback) {
				return this.props.fallback;
			}

			// Default fallback UI
			return (
				<div className="border-layout-background bg-content-background rounded-lg border p-6 shadow-sm">
					<div className="space-y-4 text-center">
						<div className="text-error text-4xl">⚠️</div>

						<h3 className="font-heading-medium text-text-contrast">Authentication Error</h3>

						<p className="font-body text-text-primary">{errorDetails.message}</p>

						{errorDetails.resolution && (
							<p className="font-body text-text-primary text-sm">{errorDetails.resolution}</p>
						)}

						<div className="flex justify-center space-x-3">
							<Button type="button" variant="secondary" onClick={() => window.location.reload()}>
								Refresh Page
							</Button>

							{errorDetails.isRetryable && (
								<Button type="button" variant="primary" onClick={this.handleRetry}>
									Try Again
								</Button>
							)}
						</div>

						{process.env.NODE_ENV === "development" && this.state.errorId && (
							<div className="text-neutral bg-neutral-background mt-4 rounded p-2 text-xs">
								Error ID: {this.state.errorId}
							</div>
						)}
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}

export default AuthErrorBoundary;

/**
 * Higher-order component for wrapping components with AuthErrorBoundary
 */
export function withAuthErrorBoundary<P extends object>(Component: React.ComponentType<P>, fallback?: ReactNode) {
	const WrappedComponent = (props: P) => (
		<AuthErrorBoundary fallback={fallback}>
			<Component {...props} />
		</AuthErrorBoundary>
	);

	WrappedComponent.displayName = `withAuthErrorBoundary(${Component.displayName || Component.name})`;

	return WrappedComponent;
}
