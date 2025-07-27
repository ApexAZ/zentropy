import React, { FormEventHandler } from "react";

interface FormProps extends Omit<React.FormHTMLAttributes<HTMLFormElement>, "onSubmit"> {
	/** Handler called when form is submitted */
	onSubmit: (event: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
	/** When true, prevents form submission and shows loading state */
	isSubmitting?: boolean;
	/** Global form error message */
	error?: string | null;
	/** Children elements - form inputs, buttons, etc. */
	children: React.ReactNode;
	/** Additional CSS classes */
	className?: string;
}

/**
 * Atomic Form Component
 *
 * Provides consistent form handling with automatic Enter key submission,
 * loading states, and error display. Wraps standard HTML form element
 * with enhanced UX patterns.
 *
 * Features:
 * - Automatic Enter key handling for form submission
 * - Consistent error display
 * - Loading state management
 * - Backwards compatible with existing form patterns
 * - Works with useFormValidation hook or direct handlers
 *
 * @example
 * // Simple form with direct handling
 * <Form onSubmit={handleSubmit} error={error} isSubmitting={loading}>
 *   <Input label="Email" value={email} onChange={setEmail} />
 *   <Button type="submit">Submit</Button>
 * </Form>
 *
 * @example
 * // With useFormValidation hook
 * <Form onSubmit={(e) => formHook.handleSubmit(e)} error={formHook.globalError}>
 *   <Input label="Name" {...formHook.getFieldProps("name")} />
 *   <Button type="submit">Save</Button>
 * </Form>
 */
const Form: React.FC<FormProps> = ({ onSubmit, isSubmitting = false, error, children, className = "", ...props }) => {
	const handleSubmit: FormEventHandler<HTMLFormElement> = async event => {
		event.preventDefault();

		// Don't submit if already submitting
		if (isSubmitting) {
			return;
		}

		try {
			await onSubmit(event);
		} catch (submitError) {
			// Let parent component handle errors
			console.error("Form submission error:", submitError);
		}
	};

	const formClasses = ["space-y-4", className].filter(Boolean).join(" ");

	return (
		<form onSubmit={handleSubmit} className={formClasses} noValidate {...props}>
			{children}

			{/* Global form error display */}
			{error && (
				<div className="text-error text-sm font-medium" role="alert">
					{error}
				</div>
			)}
		</form>
	);
};

export default Form;
