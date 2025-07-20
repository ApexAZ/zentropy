import { useState, useCallback, useMemo, useRef } from "react";

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

	// Store initial values in a ref to avoid dependency issues
	const initialValuesRef = useRef<T>(initialValues);

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
	const handleChange = useCallback((name: keyof T, value: any) => {
		setValues(prev => ({ ...prev, [name]: value }));

		// Clear error when user starts typing
		setErrors(prev => {
			if (prev[name as string]) {
				return { ...prev, [name as string]: "" };
			}
			return prev;
		});
	}, []);

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

			setValues(currentValues => {
				const result = validate(currentValues);
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

				return currentValues; // Don't actually update values
			});
		},
		[validate]
	);

	/**
	 * Handle field blur events (mark as touched)
	 */
	const handleBlur = useCallback(
		(name: keyof T) => {
			setTouched(prev => {
				const newTouched = { ...prev, [name as string]: true };

				// Validate field on blur if validation function provided and field was already touched
				if (validate && prev[name as string]) {
					validateField(name);
				}

				return newTouched;
			});
		},
		[validate, validateField]
	);

	/**
	 * Validate the entire form
	 */
	const validateForm = useCallback(
		(currentValues?: T): boolean => {
			if (!validate) return true;

			// Use provided values or current state values
			const valuesToValidate = currentValues || values;
			const result = validate(valuesToValidate);
			setErrors(result.errors);
			return result.isValid;
		},
		[validate, values]
	);

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

			// Validate form with current values
			const isFormValid = validateForm(values);
			if (!isFormValid) {
				return;
			}

			// Execute submit handler
			if (onSubmit) {
				try {
					setIsSubmitting(true);
					await onSubmit(values);
				} catch (error) {
					// Re-throw error so calling component can handle it
					throw error;
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
		setValues(initialValuesRef.current);
		setErrors({});
		setTouched({});
		setIsSubmitting(false);
	}, []);

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
