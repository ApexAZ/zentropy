import React, { Component, ErrorInfo, ReactNode } from "react";
import { logger } from "../utils/logger";

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
	onError?: ((error: Error, errorInfo: ErrorInfo) => void) | undefined;
}

interface State {
	hasError: boolean;
	error?: Error | undefined;
}

/**
 * Error Boundary component to catch and handle React errors gracefully
 * Prevents the entire app from crashing when component errors occur
 */
export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
		// Log error details
		logger.error("React Error Boundary caught an error", {
			error: {
				name: error.name,
				message: error.message,
				stack: error.stack
			},
			errorInfo: {
				componentStack: errorInfo.componentStack
			}
		});

		// Call custom error handler if provided
		this.props.onError?.(error, errorInfo);
	}

	private handleRetry = (): void => {
		this.setState({ hasError: false, error: undefined });
	};

	render(): ReactNode {
		if (this.state.hasError) {
			// Custom fallback UI if provided
			if (this.props.fallback) {
				return this.props.fallback;
			}

			// Default error UI
			return (
				<div className="bg-content-background text-text-primary border-error-border flex min-h-[200px] flex-col items-center justify-center rounded-lg border p-8">
					<div className="text-center">
						<h2 className="text-text-primary font-heading-medium mb-4">Something went wrong</h2>
						<p className="text-text-secondary mb-6 text-sm">
							An unexpected error occurred. Please try refreshing the page or contact support if the
							problem persists.
						</p>
						<div className="space-x-4">
							<button
								onClick={this.handleRetry}
								className="bg-interactive hover:bg-interactive-hover rounded px-4 py-2 text-sm font-medium text-white transition-colors"
							>
								Try Again
							</button>
							<button
								onClick={() => window.location.reload()}
								className="bg-layout-background text-text-primary hover:bg-neutral-background rounded border px-4 py-2 text-sm font-medium transition-colors"
							>
								Refresh Page
							</button>
						</div>
						{import.meta.env.MODE === "development" && this.state.error && (
							<details className="mt-6 text-left">
								<summary className="text-text-secondary cursor-pointer text-xs">
									Error Details (Development)
								</summary>
								<pre className="text-text-secondary mt-2 overflow-auto text-xs break-words whitespace-pre-wrap">
									{this.state.error.stack}
								</pre>
							</details>
						)}
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}

/**
 * HOC to wrap components with error boundary
 */
export function withErrorBoundary<P extends object>(
	WrappedComponent: React.ComponentType<P>,
	fallback?: ReactNode,
	onError?: (error: Error, errorInfo: ErrorInfo) => void
) {
	const ComponentWithErrorBoundary = (props: P) => (
		<ErrorBoundary fallback={fallback} onError={onError}>
			<WrappedComponent {...props} />
		</ErrorBoundary>
	);

	ComponentWithErrorBoundary.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;

	return ComponentWithErrorBoundary;
}
