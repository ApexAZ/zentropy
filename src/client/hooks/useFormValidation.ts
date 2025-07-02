import { useMemo } from "react";

/**
 * Generic form validation hook that provides consistent field validation behavior
 * across all forms in the application.
 *
 * @template T - The form data type
 * @param formData - The current form data
 * @param requiredFields - Array of field names that are required
 * @returns Form validation utilities
 */
export function useFormValidation<T extends Record<string, any>>(formData: T, requiredFields: (keyof T)[]) {
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
