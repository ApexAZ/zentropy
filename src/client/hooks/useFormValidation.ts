import { useState, useCallback, useMemo } from "react";

/**
 * Validation function type that takes form data and returns validation result
 */
type ValidationFunction<T> = (data: T) => {
	isValid: boolean;
	errors: Record<string, string>;
};

/**
 * Configuration for the useFormValidation hook
 */
interface UseFormValidationConfig<T> {
	initialValues: T;
	validate?: ValidationFunction<T>;
	onSubmit?: (values: T) => Promise<void> | void;
}

/**
 * Return type for the useFormValidation hook
 */
interface UseFormValidationReturn<T> {
	values: T;
	errors: Record<string, string>;
	touched: Record<string, boolean>;
	isValid: boolean;
	isSubmitting: boolean;
	handleChange: (name: keyof T, value: any) => void;
	handleBlur: (name: keyof T) => void;
	handleSubmit: (e?: React.FormEvent) => Promise<void>;
	resetForm: () => void;
	setFieldValue: (name: keyof T, value: any) => void;
	setFieldError: (name: keyof T, error: string) => void;
	setFieldTouched: (name: keyof T, touched?: boolean) => void;
	validateField: (name: keyof T) => void;
	validateForm: () => boolean;
}

/**
 * Enhanced form validation hook that provides comprehensive form state management
 * and validation capabilities across all forms in the application.
 *
 * Features:
 * - Full form lifecycle management (values, errors, touched)
 * - Integration with service layer validation
 * - Consistent error handling and UX patterns
 * - Touch tracking for optimal user experience
 * - Submission state management
 *
 * @template T - The form data type
 * @param config - Configuration object with initial values, validation, and submit handler
 * @returns Form management utilities and state
 */
export function useFormValidation<T extends Record<string, any>>(
	config: UseFormValidationConfig<T>
): UseFormValidationReturn<T> {
	const { initialValues, validate, onSubmit } = config;

	// Form state
	const [values, setValues] = useState<T>(initialValues);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [touched, setTouched] = useState<Record<string, boolean>>({});
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Compute overall form validity
	const isValid = useMemo(() => {
		return Object.keys(errors).length === 0;
	}, [errors]);

	/**
	 * Handle field value changes
	 */
	const handleChange = useCallback(
		(name: keyof T, value: any) => {
			setValues(prev => ({ ...prev, [name]: value }));

			// Clear error when user starts typing
			if (errors[name as string]) {
				setErrors(prev => ({ ...prev, [name as string]: "" }));
			}
		},
		[errors]
	);

	/**
	 * Set a specific field value
	 */
	const setFieldValue = useCallback((name: keyof T, value: any) => {
		setValues(prev => ({ ...prev, [name]: value }));
	}, []);

	/**
	 * Set a specific field error
	 */
	const setFieldError = useCallback((name: keyof T, error: string) => {
		setErrors(prev => ({ ...prev, [name as string]: error }));
	}, []);

	/**
	 * Set a specific field touched state
	 */
	const setFieldTouched = useCallback((name: keyof T, touchedValue: boolean = true) => {
		setTouched(prev => ({ ...prev, [name as string]: touchedValue }));
	}, []);

	/**
	 * Validate a single field
	 */
	const validateField = useCallback(
		(name: keyof T) => {
			if (!validate) return;

			const result = validate(values);
			const fieldError = result.errors[name as string];

			if (fieldError) {
				setErrors(prev => ({ ...prev, [name as string]: fieldError }));
			} else {
				setErrors(prev => {
					const newErrors = { ...prev };
					delete newErrors[name as string];
					return newErrors;
				});
			}
		},
		[validate, values]
	);

	/**
	 * Handle field blur events (mark as touched)
	 */
	const handleBlur = useCallback(
		(name: keyof T) => {
			setTouched(prev => ({ ...prev, [name as string]: true }));

			// Validate field on blur if validation function provided
			if (validate && touched[name as string]) {
				validateField(name);
			}
		},
		[validate, touched, validateField]
	);

	/**
	 * Validate the entire form
	 */
	const validateForm = useCallback((): boolean => {
		if (!validate) return true;

		const result = validate(values);
		setErrors(result.errors);
		return result.isValid;
	}, [validate, values]);

	/**
	 * Handle form submission
	 */
	const handleSubmit = useCallback(
		async (e?: React.FormEvent) => {
			if (e) {
				e.preventDefault();
			}

			// Mark all fields as touched
			const allFieldsTouched = Object.keys(values).reduce(
				(acc, key) => {
					acc[key] = true;
					return acc;
				},
				{} as Record<string, boolean>
			);
			setTouched(allFieldsTouched);

			// Validate form
			const isFormValid = validateForm();
			if (!isFormValid) {
				return;
			}

			// Execute submit handler
			if (onSubmit) {
				try {
					setIsSubmitting(true);
					await onSubmit(values);
				} catch {
					// Error handling is managed by the onSubmit handler
					// This allows for flexible error handling strategies
				} finally {
					setIsSubmitting(false);
				}
			}
		},
		[values, validateForm, onSubmit]
	);

	/**
	 * Reset form to initial state
	 */
	const resetForm = useCallback(() => {
		setValues(initialValues);
		setErrors({});
		setTouched({});
		setIsSubmitting(false);
	}, [initialValues]);

	return {
		values,
		errors,
		touched,
		isValid,
		isSubmitting,
		handleChange,
		handleBlur,
		handleSubmit,
		resetForm,
		setFieldValue,
		setFieldError,
		setFieldTouched,
		validateField,
		validateForm
	};
}

/**
 * Legacy helper functions for backward compatibility
 * These will be maintained for existing components that haven't migrated yet
 */
export function useFormValidationLegacy<T extends Record<string, any>>(formData: T, requiredFields: (keyof T)[]) {
	/**
	 * Check if a field is empty or contains only whitespace
	 */
	const isFieldEmpty = useMemo(() => {
		return (fieldName: keyof T): boolean => {
			const value = formData[fieldName];

			// Handle different data types
			if (typeof value === "string") {
				return !value || value.trim() === "";
			}

			if (typeof value === "number") {
				return value === 0;
			}

			// For other types, check if falsy
			return !value;
		};
	}, [formData]);

	/**
	 * Check if a field is marked as required
	 */
	const isFieldRequired = useMemo(() => {
		return (fieldName: keyof T): boolean => {
			return requiredFields.includes(fieldName);
		};
	}, [requiredFields]);

	/**
	 * Get the appropriate border class for a form field based on its state
	 */
	const getFieldBorderClass = useMemo(() => {
		return (fieldName: keyof T, isRequired?: boolean): string => {
			// Use explicit isRequired parameter or fall back to checking requiredFields
			const fieldIsRequired = isRequired !== undefined ? isRequired : isFieldRequired(fieldName);

			if (!fieldIsRequired) {
				return "border-layout-background";
			}

			return isFieldEmpty(fieldName) ? "border-red-300" : "border-layout-background";
		};
	}, [isFieldEmpty, isFieldRequired]);

	return {
		isFieldEmpty,
		isFieldRequired,
		getFieldBorderClass
	};
}
